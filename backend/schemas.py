from datetime import date
from typing import Optional, List

from pydantic import BaseModel


# ---------- RECEITAS ----------


class RevenueBase(BaseModel):
    description: str
    category: Optional[str] = None
    account: Optional[str] = None
    due_date: date
    payment_date: Optional[date] = None
    amount_total: float
    installments: int = 1
    installment_n: int = 1
    amount_installment: float

    class Config:
        orm_mode = True


class RevenueCreate(BaseModel):
    description: str
    category: Optional[str] = None
    account: Optional[str] = None
    due_date: date
    payment_date: Optional[date] = None
    amount_total: float
    installments: int = 1

    class Config:
        orm_mode = True


class RevenueOut(RevenueBase):
    id: int


# ---------- DESPESAS ----------


class ExpenseBase(BaseModel):
    description: str
    category: Optional[str] = None
    account: Optional[str] = None
    due_date: date
    payment_date: Optional[date] = None
    amount_total: float
    installments: int = 1
    installment_n: int = 1
    amount_installment: float

    class Config:
        orm_mode = True


class ExpenseCreate(BaseModel):
    description: str
    category: Optional[str] = None
    account: Optional[str] = None
    due_date: date
    payment_date: Optional[date] = None
    amount_total: float
    installments: int = 1

    class Config:
        orm_mode = True


class ExpenseOut(ExpenseBase):
    id: int


# ---------- CARTÕES ----------


class CreditCardBase(BaseModel):
    name: str
    closing_day: int
    due_day: int
    limit_total: float
    is_active: bool = True

    class Config:
        orm_mode = True


class CreditCardCreate(CreditCardBase):
    pass


class CreditCardOut(CreditCardBase):
    id: int


# ---------- TRANSAÇÕES DE CARTÃO ----------


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

    class Config:
        orm_mode = True


class CreditCardTransactionCreate(BaseModel):
    card_id: int
    description: str
    category: Optional[str] = None
    purchase_date: date
    due_date: date
    amount_total: float
    installments: int = 1

    class Config:
        orm_mode = True


class CreditCardTransactionOut(CreditCardTransactionBase):
    id: int


# ---------- PARÂMETROS SIMPLES (se quiser usar depois) ----------


class SimpleNamedItem(BaseModel):
    id: int
    name: str

    class Config:
        orm_mode = True


class SimpleNamedItemCreate(BaseModel):
    name: str
