from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional

from . import models, schemas, crud
from .database import SessionLocal, engine

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Gestão Financeira Pessoal")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.get("/api/health")
def health():
  return {"status": "ok"}


# ---------- RECEITAS ----------

@app.get("/api/receitas")
def listar_receitas(db: Session = Depends(get_db)):
    # Retorna todas as receitas para o frontend
    return crud.get_receitas(db)


@app.post("/api/receitas")
def criar_receita(receita: schemas.RevenueCreate, db: Session = Depends(get_db)):
    return crud.create_receita(db, receita)


@app.put("/api/receitas/{receita_id}")
def atualizar_receita(
    receita_id: int,
    receita: schemas.RevenueCreate,
    db: Session = Depends(get_db),
):
    db_receita = crud.update_receita(db, receita_id, receita)
    if not db_receita:
        raise HTTPException(status_code=404, detail="Receita não encontrada")
    return db_receita

    # Cria receita (e parcelas, se houver) e devolve o que foi salvo
    return crud.create_receita(db, receita)


@app.put("/api/receitas/{receita_id}")
def atualizar_receita(
    receita_id: int,
    receita: schemas.RevenueCreate,
    db: Session = Depends(get_db),
):
    db_receita = crud.update_receita(db, receita_id, receita)
    if not db_receita:
        raise HTTPException(status_code=404, detail="Receita não encontrada")
    return db_receita


@app.delete("/api/receitas/{receita_id}", status_code=204)
def excluir_receita(receita_id: int, db: Session = Depends(get_db)):
    ok = crud.delete_receita(db, receita_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Receita não encontrada")



@app.delete("/api/receitas/{receita_id}", status_code=204)
def excluir_receita(receita_id: int, db: Session = Depends(get_db)):
    ok = crud.delete_receita(db, receita_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Receita não encontrada")


@app.patch("/api/receitas/{revenue_id}/pagamento", response_model=schemas.RevenueOut)
def update_pagamento_receita(
    revenue_id: int,
    data: schemas.RevenuePaymentUpdate,
    db: Session = Depends(get_db),
):
    obj = crud.update_revenue_payment_date(db, revenue_id, data.payment_date)
    if not obj:
        raise HTTPException(status_code=404, detail="Receita não encontrada")
    return obj


# ---------- DESPESAS ----------

@app.get("/api/despesas")
def listar_despesas(db: Session = Depends(get_db)):
    return crud.get_despesas(db)


@app.post("/api/despesas")
def criar_despesa(
    despesa: schemas.ExpenseCreate,
    db: Session = Depends(get_db),
):
    return crud.create_despesa(db, despesa)


@app.put("/api/despesas/{despesa_id}")
def atualizar_despesa(
    despesa_id: int,
    despesa: schemas.ExpenseCreate,
    db: Session = Depends(get_db),
):
    db_despesa = crud.update_despesa(db, despesa_id, despesa)
    if not db_despesa:
        raise HTTPException(status_code=404, detail="Despesa não encontrada")
    return db_despesa


@app.delete("/api/despesas/{despesa_id}", status_code=204)
def excluir_despesa(despesa_id: int, db: Session = Depends(get_db)):
    ok = crud.delete_despesa(db, despesa_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Despesa não encontrada")


@app.patch("/api/despesas/{expense_id}/pagamento", response_model=schemas.ExpenseOut)
def update_pagamento_despesa(
    expense_id: int,
    data: schemas.ExpensePaymentUpdate,
    db: Session = Depends(get_db),
):
    obj = crud.update_expense_payment_date(db, expense_id, data.payment_date)
    if not obj:
        raise HTTPException(status_code=404, detail="Despesa não encontrada")
    return obj


# ---------- CARTÕES DE CRÉDITO ----------

@app.get("/api/cartoes", response_model=List[schemas.CreditCardOut])
def list_cartoes(db: Session = Depends(get_db)):
    return crud.get_credit_cards(db)


@app.post("/api/cartoes", response_model=schemas.CreditCardOut)
def create_cartao(card: schemas.CreditCardCreate, db: Session = Depends(get_db)):
    return crud.create_credit_card(db, card)


@app.get("/api/transacoes-cartao")
def listar_transacoes_cartao(db: Session = Depends(get_db)):
    return crud.get_transacoes_cartao(db)


@app.post("/api/transacoes-cartao")
def criar_transacao_cartao(
    transacao: schemas.CreditCardTransactionCreate,
    db: Session = Depends(get_db),
):
    return crud.create_transacao_cartao(db, transacao)


@app.delete("/api/transacoes-cartao/{transacao_id}", status_code=204)
def excluir_transacao_cartao(transacao_id: int, db: Session = Depends(get_db)):
    ok = crud.delete_transacao_cartao(db, transacao_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Transação não encontrada")


@app.delete("/api/transacoes-cartao/{transacao_id}", status_code=204)
def excluir_transacao_cartao(transacao_id: int, db: Session = Depends(get_db)):
    ok = crud.delete_transacao_cartao(db, transacao_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Transação não encontrada")


# ---------- PARÂMETROS DE RECEITA ----------

@app.get("/api/receita/categorias", response_model=List[schemas.RevenueCategoryOut])
def list_revenue_categories(db: Session = Depends(get_db)):
    return crud.get_revenue_categories(db)


@app.post("/api/receita/categorias", response_model=schemas.RevenueCategoryOut)
def create_revenue_category(
    item: schemas.RevenueCategoryCreate, db: Session = Depends(get_db)
):
    return crud.create_revenue_category(db, item)


@app.get("/api/receita/contas", response_model=List[schemas.RevenueAccountOut])
def list_revenue_accounts(db: Session = Depends(get_db)):
    return crud.get_revenue_accounts(db)


@app.post("/api/receita/contas", response_model=schemas.RevenueAccountOut)
def create_revenue_account(
    item: schemas.RevenueAccountCreate, db: Session = Depends(get_db)
):
    return crud.create_revenue_account(db, item)


@app.get(
    "/api/receita/formas-pagamento",
    response_model=List[schemas.RevenuePaymentMethodOut],
)
def list_revenue_payment_methods(db: Session = Depends(get_db)):
    return crud.get_revenue_payment_methods(db)


@app.post(
    "/api/receita/formas-pagamento",
    response_model=schemas.RevenuePaymentMethodOut,
)
def create_revenue_payment_method(
    item: schemas.RevenuePaymentMethodCreate, db: Session = Depends(get_db)
):
    return crud.create_revenue_payment_method(db, item)


# ---------- PARÂMETROS DE DESPESA ----------

@app.get("/api/despesa/categorias", response_model=List[schemas.ExpenseCategoryOut])
def list_expense_categories(db: Session = Depends(get_db)):
    return crud.get_expense_categories(db)


@app.post("/api/despesa/categorias", response_model=schemas.ExpenseCategoryOut)
def create_expense_category(
    item: schemas.ExpenseCategoryCreate, db: Session = Depends(get_db)
):
    return crud.create_expense_category(db, item)


@app.get("/api/despesa/contas", response_model=List[schemas.ExpenseAccountOut])
def list_expense_accounts(db: Session = Depends(get_db)):
    return crud.get_expense_accounts(db)


@app.post("/api/despesa/contas", response_model=schemas.ExpenseAccountOut)
def create_expense_account(
    item: schemas.ExpenseAccountCreate, db: Session = Depends(get_db)
):
    return crud.create_expense_account(db, item)


@app.get(
    "/api/despesa/formas-pagamento",
    response_model=List[schemas.ExpensePaymentMethodOut],
)
def list_expense_payment_methods(db: Session = Depends(get_db)):
    return crud.get_expense_payment_methods(db)


@app.post(
    "/api/despesa/formas-pagamento",
    response_model=schemas.ExpensePaymentMethodOut,
)
def create_expense_payment_method(
    item: schemas.ExpensePaymentMethodCreate, db: Session = Depends(get_db)
):
    return crud.create_expense_payment_method(db, item)
