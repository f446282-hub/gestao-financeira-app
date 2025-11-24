# backend/schemas.py
from datetime import date
from typing import Optional

from pydantic import BaseModel


# ---------- REVENUE ----------

class RevenueBase(BaseModel):
    description: str
    category: Optional[str] = None
    due_date: date
    payment_date: Optional[date] = None
    amount_total: float
    installments: int = 1
    installment_n: int = 1
    amount_installment: float
    paid: bool = False


class RevenueCreate(RevenueBase):
    pass


class RevenueUpdate(RevenueBase):
    pass


class RevenueOut(RevenueBase):
    id: int

    class Config:
        orm_mode = True


# ---------- EXPENSE ----------

class ExpenseBase(BaseModel):
    description: str
    category: Optional[str] = None
    due_date: date
    payment_date: Optional[date] = None
    amount_total: float
    installments: int = 1
    installment_n: int = 1
    amount_installment: float
    paid: bool = False


class ExpenseCreate(ExpenseBase):
    pass


class ExpenseUpdate(ExpenseBase):
    pass


class ExpenseOut(ExpenseBase):
    id: int

    class Config:
        orm_mode = True


# ---------- CREDIT CARD ----------

class CreditCardBase(BaseModel):
    name: str
    last_digits: Optional[str] = None
    closing_day: int
    due_day: int
    limit_value: float
    status: str = "ativo"
    logo_url: Optional[str] = None


class CreditCardCreate(CreditCardBase):
    pass


class CreditCardUpdate(CreditCardBase):
    pass


class CreditCardOut(CreditCardBase):
    id: int

    class Config:
        orm_mode = True


# ---------- CREDIT CARD TRANSACTION ----------

class CreditCardTransactionBase(BaseModel):
    card_id: int
    description: str
    category: Optional[str] = None
    purchase_date: date
    due_date: date
    amount_total: float
    installments: int = 1
    installment_n: int = 1
    amount_installment: float
    paid: bool = False


class CreditCardTransactionCreate(CreditCardTransactionBase):
    pass


class CreditCardTransactionUpdate(CreditCardTransactionBase):
    pass


class CreditCardTransactionOut(CreditCardTransactionBase):
    id: int

    class Config:
        orm_mode = True
