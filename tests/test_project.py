from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def test_expense_tracker_has_a_direct_browser_entry_point():
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    assert '<title>Expense Tracker' in html
    assert 'id="expense-form"' in html
    assert 'id="budget-form"' in html
    assert 'id="transaction-rows"' in html


def test_expense_tracker_assets_are_local_and_present():
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    assert (ROOT / "style.css").is_file()
    assert (ROOT / "app.js").is_file()
    assert 'href="style.css"' in html
    assert 'src="app.js"' in html


def test_expense_tracker_implements_crud_budgeting_and_search():
    js = (ROOT / "app.js").read_text(encoding="utf-8")
    assert "localStorage" in js
    assert "expenses.push(item)" in js
    assert "expenses[index] = item" in js
    assert "expenses.filter(expense => expense.id !== item.id)" in js
    assert "budget-form" in js
    assert "search-transactions" in js
    assert "category-filter" in js
