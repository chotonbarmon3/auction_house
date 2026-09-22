from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from database import get_db
from deps import get_current_user
from models import Auction, Bid, User, Product, Role
from schemas import BidCreate, BidOut

router = APIRouter(prefix="/auctions", tags=["bids"])


@router.post("/{auction_id}/bids", response_model=BidOut, status_code=status.HTTP_201_CREATED)
async def place_bid(
    auction_id: int,
    payload: BidCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user.role == Role.admin:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Admins cannot place bids")

    result = await db.execute(
        select(Auction)
        .options(selectinload(Auction.product), selectinload(Auction.bids))
        .where(Auction.id == auction_id)
    )
    auction = result.scalar_one_or_none()
    if not auction:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Auction not found")

    now = datetime.now(timezone.utc)
    if now < auction.start_time:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "This auction has not started yet")
    if now > auction.end_time:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "This auction has already ended")

    product: Product = auction.product
    current_high = max((b.amount for b in auction.bids), default=None)
    floor = current_high if current_high is not None else product.starting_price
    min_allowed = floor + product.min_increment if current_high is not None else floor

    if payload.amount < min_allowed:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Bid must be at least {min_allowed}",
        )

    bid = Bid(auction_id=auction.id, bidder_id=user.id, amount=payload.amount)
    db.add(bid)
    await db.commit()
    await db.refresh(bid)

    return BidOut(
        id=bid.id,
        amount=bid.amount,
        created_at=bid.created_at,
        bidder_id=bid.bidder_id,
        bidder_username=user.username,
    )
