import frappe
from frappe.utils import add_days


def execute(filters=None):

    filters = filters or {}

    conditions = "WHERE 1=1"
    values = {}

    # =========================
    # FILTERS
    # =========================

    if filters.get("due_date"):
        conditions += " AND p.due_date <= %(due_date)s"
        values["due_date"] = filters["due_date"]

    if filters.get("status"):
        conditions += " AND p.status = %(status)s"
        values["status"] = filters["status"]

    if filters.get("membership_plan"):
        conditions += " AND m.membership_plan = %(membership_plan)s"
        values["membership_plan"] = filters["membership_plan"]

    # =========================
    # QUERY
    # =========================

    data = frappe.db.sql(f"""
        SELECT
            p.member,
            m.membership_plan,
            p.total_amount,
            p.paid_amount,
            p.outstanding_amount,
            p.due_date,
            p.status

        FROM `tabGym Payment` p

        LEFT JOIN `tabGym Membership` m
        ON m.name = p.membership

        {conditions}

        ORDER BY p.due_date ASC
    """, values, as_dict=True)

    result = []

    for d in data:

        next_due = None

        if d.due_date:
            next_due = add_days(d.due_date, 30)

        result.append({

            "member": d.member,

            "plan": d.membership_plan,

            "due_amount": d.total_amount,

            "paid_amount": d.paid_amount,

            "outstanding": d.outstanding_amount,

            "last_payment": d.due_date,

            "next_due": next_due,

            "status": d.status

        })

    # =========================
    # COLUMNS
    # =========================

    columns = [

        {
            "label": "Member",
            "fieldname": "member",
            "fieldtype": "Link",
            "options": "Gym Member",
            "width": 180
        },

        {
            "label": "Plan",
            "fieldname": "plan",
            "fieldtype": "Data",
            "width": 150
        },

        {
            "label": "Due Amount",
            "fieldname": "due_amount",
            "fieldtype": "Currency",
            "width": 130
        },

        {
            "label": "Paid Amount",
            "fieldname": "paid_amount",
            "fieldtype": "Currency",
            "width": 130
        },

        {
            "label": "Outstanding",
            "fieldname": "outstanding",
            "fieldtype": "Currency",
            "width": 130
        },

        {
            "label": "Due Date",
            "fieldname": "last_payment",
            "fieldtype": "Date",
            "width": 120
        },

        {
            "label": "Next Due",
            "fieldname": "next_due",
            "fieldtype": "Date",
            "width": 120
        },

        {
            "label": "Status",
            "fieldname": "status",
            "fieldtype": "Data",
            "width": 120
        }

    ]

    return columns, result