from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from backend import models, schemas, crud

from database import SessionLocal, engine

# Garante que as tabelas existem no banco
models.Base.metadata.create_all(bind=engine)

# ----------------------------------------------------------------------------
# App e CORS
# ----------------------------------------------------------------------------

app = FastAPI(
    title="Gestão Financeira API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # depois podemos restringir
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------------------------------------------------------------------
# Dependência de DB
# ----------------------------------------------------------------------------

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ----------------------------------------------------------------------------
# RECEITAS
# ----------------------------------------------------------------------------

@app.get("/api/receitas", response_model=list[schemas.RevenueOut])
def listar_receitas(db: Session = Depends(get_db)):
    return crud.get_all_revenues(db)


@app.post("/api/receitas", response_model=schemas.RevenueOut)
def criar_receita(receita: schemas.RevenueCreate, db: Session = Depends(get_db)):
    return crud.create_revenue_with_installments(db, receita)


@app.put("/api/receitas/{receita_id}", response_model=schemas.RevenueOut)
def atualizar_receita(
    receita_id: int,
    receita: schemas.RevenueCreate,
    db: Session = Depends(get_db),
):
    updated = crud.update_revenue(db, receita_id, receita)
    if not updated:
        raise HTTPException(status_code=404, detail="Receita não encontrada")
    return updated


@app.delete("/api/receitas/{receita_id}")
def excluir_receita(receita_id: int, db: Session = Depends(get_db)):
    if not crud.delete_revenue(db, receita_id):
        raise HTTPException(status_code=404, detail="Receita não encontrada")
    return {"detail": "Receita excluída com sucesso"}

# ----------------------------------------------------------------------------
# DESPESAS
# ----------------------------------------------------------------------------

@app.get("/api/despesas", response_model=list[schemas.ExpenseOut])
def listar_despesas(db: Session = Depends(get_db)):
    return crud.get_all_expenses(db)


@app.post("/api/despesas", response_model=schemas.ExpenseOut)
def criar_despeza(despesa: schemas.ExpenseCreate, db: Session = Depends(get_db)):
    return crud.create_expense_with_installments(db, despesa)


@app.put("/api/despesas/{despesa_id}", response_model=schemas.ExpenseOut)
def atualizar_despesa(
    despesa_id: int,
    despesa: schemas.ExpenseCreate,
    db: Session = Depends(get_db),
):
    updated = crud.update_expense(db, despesa_id, despesa)
    if not updated:
        raise HTTPException(status_code=404, detail="Despesa não encontrada")
    return updated


@app.delete("/api/despesas/{despesa_id}")
def excluir_despesa(despesa_id: int, db: Session = Depends(get_db)):
    if not crud.delete_expense(db, despesa_id):
        raise HTTPException(status_code=404, detail="Despesa não encontrada")
    return {"detail": "Despesa excluída com sucesso"}

# ----------------------------------------------------------------------------
# CARTÕES DE CRÉDITO
# ----------------------------------------------------------------------------

@app.get("/api/cartoes", response_model=list[schemas.CreditCardOut])
def listar_cartoes(db: Session = Depends(get_db)):
    return crud.get_all_credit_cards(db)


@app.post("/api/cartoes", response_model=schemas.CreditCardOut)
def criar_cartao(cartao: schemas.CreditCardCreate, db: Session = Depends(get_db)):
    return crud.create_credit_card(db, cartao)


@app.put("/api/cartoes/{cartao_id}", response_model=schemas.CreditCardOut)
def atualizar_cartao(
    cartao_id: int,
    cartao: schemas.CreditCardCreate,
    db: Session = Depends(get_db),
):
    updated = crud.update_credit_card(db, cartao_id, cartao)
    if not updated:
        raise HTTPException(status_code=404, detail="Cartão não encontrado")
    return updated


@app.delete("/api/cartoes/{cartao_id}")
def excluir_cartao(cartao_id: int, db: Session = Depends(get_db)):
    if not crud.delete_credit_card(db, cartao_id):
        raise HTTPException(status_code=404, detail="Cartão não encontrado")
    return {"detail": "Cartão excluído com sucesso"}

# ----------------------------------------------------------------------------
# LANÇAMENTOS DE CARTÃO
# ----------------------------------------------------------------------------

@app.get(
    "/api/transacoes-cartao",
    response_model=list[schemas.CreditCardTransactionOut],
)
def listar_transacoes_cartao(db: Session = Depends(get_db)):
    return crud.get_all_credit_card_transactions(db)


@app.post(
    "/api/transacoes-cartao",
    response_model=schemas.CreditCardTransactionOut,
)
def criar_transacao_cartao(
    transacao: schemas.CreditCardTransactionCreate,
    db: Session = Depends(get_db),
):
    return crud.create_credit_card_transaction_with_installments(db, transacao)


@app.put(
    "/api/transacoes-cartao/{transacao_id}",
    response_model=schemas.CreditCardTransactionOut,
)
def atualizar_transacao_cartao(
    transacao_id: int,
    transacao: schemas.CreditCardTransactionCreate,
    db: Session = Depends(get_db),
):
    updated = crud.update_credit_card_transaction(db, transacao_id, transacao)
    if not updated:
        raise HTTPException(status_code=404, detail="Transação não encontrada")
    return updated


@app.delete("/api/transacoes-cartao/{transacao_id}")
def excluir_transacao_cartao(transacao_id: int, db: Session = Depends(get_db)):
    if not crud.delete_credit_card_transaction(db, transacao_id):
        raise HTTPException(status_code=404, detail="Transação não encontrada")
    return {"detail": "Transação excluída com sucesso"}

# ----------------------------------------------------------------------------
# DASHBOARD / RESUMOS
# ----------------------------------------------------------------------------

@app.get("/api/dashboard/caixa")
def resumo_dashboard(db: Session = Depends(get_db)):
    """
    Endpoint simples de exemplo para o dashboard.
    (A lógica real você já tinha montado no CRUD; podemos ir refinando depois)
    """
    return crud.get_dashboard_summary(db)
