import frappe
from frappe.utils import today, date_diff

def execute(filters=None):

    filters = filters or {}

    conditions = "WHERE 1=1"
    values = {}

    if filters.get("from_date") and filters.get("to_date"):
        conditions += " AND m.end_date BETWEEN %(from_date)s AND %(to_date)s"
        values["from_date"] = filters["from_date"]
        values["to_date"] = filters["to_date"]

    if filters.get("status"):
        conditions += " AND m.status = %(status)s"
        values["status"] = filters["status"]

    if filters.get("plan"):
        conditions += " AND m.membership_plan = %(plan)s"
        values["plan"] = filters["plan"]

    data = frappe.db.sql(f"""
        SELECT
            m.member,
            m.membership_plan,
            m.start_date,
            m.end_date,
            m.status,
            gm.member_name,
            gm.mobile_number
        FROM `tabGym Membership` m
        LEFT JOIN `tabGym Member` gm ON gm.name = m.member
        {conditions}
        ORDER BY m.end_date ASC
    """, values, as_dict=True)

    result = []

    for d in data:

        remaining_days = None
        if d.end_date:
            remaining_days = date_diff(d.end_date, today())

        renewal_status = "Expired"
        if remaining_days is not None and remaining_days > 0:
            renewal_status = "Active"
        elif remaining_days is not None and remaining_days <= 7:
            renewal_status = "Expiring Soon"

        result.append({
            "member_name": d.member_name,
            "plan": d.membership_plan,
            "start_date": d.start_date,
            "end_date": d.end_date,
            "remaining_days": remaining_days,
            "contact": d.mobile_number,
            "renewal_status": renewal_status
        })

    columns = [
        {"label": "Member Name", "fieldname": "member_name", "fieldtype": "Data", "width": 200},
        {"label": "Plan", "fieldname": "plan", "fieldtype": "Data", "width": 150},
        {"label": "Start Date", "fieldname": "start_date", "fieldtype": "Date", "width": 120},
        {"label": "Expiry Date", "fieldname": "end_date", "fieldtype": "Date", "width": 120},
        {"label": "Remaining Days", "fieldname": "remaining_days", "fieldtype": "Int", "width": 120},
        {"label": "Contact", "fieldname": "contact", "fieldtype": "Data", "width": 150},
        {"label": "Renewal Status", "fieldname": "renewal_status", "fieldtype": "Data", "width": 150},
    ]

    return columns, result