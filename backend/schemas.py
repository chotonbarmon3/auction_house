from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, ConfigDict

from models import Role


# ---------- Auth / Users ----------

class UserRegister(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    role: Role = Role.user
    admin_code: Optional[str] = None


class UserLogin(BaseModel):
    username: str
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    username: str
    email: EmailStr
    role: Role


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ---------- Products ----------

class ProductCreate(BaseModel):
    name: str = Field(min_length=2, max_length=150)
    description: str = ""
    image_url: str = ""
    starting_price: Decimal = Field(gt=0)
    min_increment: Decimal = Field(default=Decimal("1"), gt=0)


class ProductOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    description: str
    image_url: str
    starting_price: Decimal
    min_increment: Decimal
    owner_id: int


# ---------- Auctions ----------

class AuctionCreate(BaseModel):
    product: ProductCreate
    start_time: datetime
    end_time: datetime


class BidOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    amount: Decimal
    created_at: datetime
    bidder_id: int
    bidder_username: Optional[str] = None


class AuctionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    start_time: datetime
    end_time: datetime
    product: ProductOut
    status: str
    highest_bid: Optional[Decimal] = None
    highest_bidder: Optional[str] = None
    total_bids: int = 0
    winner: Optional[str] = None


class AuctionDetail(AuctionOut):
    bids: list[BidOut] = []


# ---------- Bids ----------

class BidCreate(BaseModel):
    amount: Decimal = Field(gt=0)
