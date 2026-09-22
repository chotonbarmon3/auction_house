from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from database import get_db
from deps import get_current_user, require_admin
from models import Auction, Product, Bid, User
from schemas import AuctionCreate, AuctionOut, AuctionDetail, BidOut

router = APIRouter(prefix="/auctions", tags=["auctions"])


def compute_status(auction: Auction) -> str:
    now = datetime.now(timezone.utc)
    if now < auction.start_time:
        return "upcoming"
    if now > auction.end_time:
        return "ended"
    return "live"


def to_auction_out(auction: Auction) -> AuctionOut:
    bids = sorted(auction.bids, key=lambda b: b.amount, reverse=True)
    top = bids[0] if bids else None
    status_ = compute_status(auction)
    winner = None
    if status_ == "ended" and top:
        winner = top.bidder.username
    return AuctionOut(
        id=auction.id,
        start_time=auction.start_time,
        end_time=auction.end_time,
        product=auction.product,
        status=status_,
        highest_bid=top.amount if top else None,
        highest_bidder=top.bidder.username if top else None,
        total_bids=len(bids),
        winner=winner,
    )


@router.post("", response_model=AuctionOut, status_code=status.HTTP_201_CREATED)
async def create_auction(
    payload: AuctionCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    if payload.end_time <= payload.start_time:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "end_time must be after start_time")

    product = Product(
        name=payload.product.name,
        description=payload.product.description,
        image_url=payload.product.image_url,
        starting_price=payload.product.starting_price,
        min_increment=payload.product.min_increment,
        owner_id=admin.id,
    )
    db.add(product)
    await db.flush()

    auction = Auction(
        product_id=product.id,
        start_time=payload.start_time,
        end_time=payload.end_time,
    )
    db.add(auction)
    await db.commit()

    result = await db.execute(
        select(Auction)
        .options(selectinload(Auction.product), selectinload(Auction.bids).selectinload(Bid.bidder))
        .where(Auction.id == auction.id)
    )
    auction = result.scalar_one()
    return to_auction_out(auction)


@router.get("", response_model=list[AuctionOut])
async def list_auctions(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Auction)
        .options(selectinload(Auction.product), selectinload(Auction.bids).selectinload(Bid.bidder))
        .order_by(Auction.start_time.desc())
    )
    auctions = result.scalars().all()
    return [to_auction_out(a) for a in auctions]


@router.get("/mine", response_model=list[AuctionOut])
async def list_my_auctions(db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    result = await db.execute(
        select(Auction)
        .join(Product)
        .options(selectinload(Auction.product), selectinload(Auction.bids).selectinload(Bid.bidder))
        .where(Product.owner_id == admin.id)
        .order_by(Auction.start_time.desc())
    )
    auctions = result.scalars().all()
    return [to_auction_out(a) for a in auctions]


@router.get("/{auction_id}", response_model=AuctionDetail)
async def get_auction(auction_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Auction)
        .options(selectinload(Auction.product), selectinload(Auction.bids).selectinload(Bid.bidder))
        .where(Auction.id == auction_id)
    )
    auction = result.scalar_one_or_none()
    if not auction:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Auction not found")

    base = to_auction_out(auction)
    bids_sorted = sorted(auction.bids, key=lambda b: b.amount, reverse=True)
    bid_outs = [
        BidOut(
            id=b.id,
            amount=b.amount,
            created_at=b.created_at,
            bidder_id=b.bidder_id,
            bidder_username=b.bidder.username,
        )
        for b in bids_sorted
    ]
    return AuctionDetail(**base.model_dump(), bids=bid_outs)
