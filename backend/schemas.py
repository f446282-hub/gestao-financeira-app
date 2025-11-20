from pydantic import BaseModel
from datetime import date
from typing import Optional


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
    payment_method: Optional[str] = None
    notes: Optional[str] = None


class RevenueCreate(RevenueBase):
    pass


class RevenueOut(RevenueBase):
    id: int

    class Config:
        from_attributes = True


class RevenuePaymentUpdate(BaseModel):
    payment_date: Optional[date] = None


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
    payment_method: Optional[str] = None
    notes: Optional[str] = None


class ExpenseCreate(ExpenseBase):
    pass


class ExpenseOut(ExpenseBase):
    id: int

    class Config:
        from_attributes = True


class ExpensePaymentUpdate(BaseModel):
    payment_date: Optional[date] = None


# ---------- CARTÕES DE CRÉDITO ----------

class CreditCardBase(BaseModel):
    name: str
    closing_day: int
    due_day: int
    limit_total: Optional[float] = None
    annual_fee: Optional[float] = None
    status: str = "ativo"


class CreditCardCreate(CreditCardBase):
    pass


class CreditCardOut(CreditCardBase):
    id: int

    class Config:
        from_attributes = True


class CreditCardTransactionBase(BaseModel):
    credit_card_id: int
    description: str
    category: Optional[str] = None
    purchase_date: date
    due_date: date
    amount_total: float
    installments: int = 1
    installment_n: int = 1
    amount_installment: float


class CreditCardTransactionCreate(CreditCardTransactionBase):
    pass


class CreditCardTransactionOut(CreditCardTransactionBase):
    id: int

    class Config:
        from_attributes = True


# ---------- PARÂMETROS DE RECEITA ----------

class RevenueCategoryBase(BaseModel):
    name: str


class RevenueCategoryCreate(RevenueCategoryBase):
    pass


class RevenueCategoryOut(RevenueCategoryBase):
    id: int

    class Config:
        from_attributes = True


class RevenueAccountBase(BaseModel):
    name: str


class RevenueAccountCreate(RevenueAccountBase):
    pass


class RevenueAccountOut(RevenueAccountBase):
    id: int

    class Config:
        from_attributes = True


class RevenuePaymentMethodBase(BaseModel):
    name: str


class RevenuePaymentMethodCreate(RevenuePaymentMethodBase):
    pass


class RevenuePaymentMethodOut(RevenuePaymentMethodBase):
    id: int

    class Config:
        from_attributes = True


# ---------- PARÂMETROS DE DESPESA ----------

class ExpenseCategoryBase(BaseModel):
    name: str


class ExpenseCategoryCreate(ExpenseCategoryBase):
    pass


class ExpenseCategoryOut(ExpenseCategoryBase):
    id: int

    class Config:
        from_attributes = True


class ExpenseAccountBase(BaseModel):
    name: str


class ExpenseAccountCreate(ExpenseAccountBase):
    pass


class ExpenseAccountOut(ExpenseAccountBase):
    id: int

    class Config:
        from_attributes = True


class ExpensePaymentMethodBase(BaseModel):
    name: str


class ExpensePaymentMethodCreate(ExpensePaymentMethodBase):
    pass


class ExpensePaymentMethodOut(ExpensePaymentMethodBase):
    id: int

    class Config:
        from_attributes = True
