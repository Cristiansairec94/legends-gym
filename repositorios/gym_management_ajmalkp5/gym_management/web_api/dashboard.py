import frappe
from frappe.utils import today, add_days

@frappe.whitelist()
def get_admin_dashboard():

    try:

        total_revenue = frappe.db.sql("""
            SELECT SUM(IFNULL(paid_amount, 0))
            FROM `tabGym Payment`
        """)[0][0] or 0


        active_members = frappe.db.count(
            "Gym Membership",
            {"status": "Active"}
        )


        trainer_count = frappe.db.count("Trainer")


        attendance_today = 0

        if frappe.db.exists("DocType", "Training Schedule"):
            attendance_today = frappe.db.count(
                "Training Schedule",
                {
                    "start_time": ["between", [
                        today() + " 00:00:00",
                        today() + " 23:59:59"
                    ]]
                }
            )


        next_7 = add_days(today(), 7)

        expiring = frappe.db.sql("""
            SELECT name, member, end_date
            FROM `tabGym Membership`
            WHERE status='Active'
            AND end_date BETWEEN %s AND %s
        """, (today(), next_7), as_dict=True)


        return {
            "status": "success",
            "data": {
                "total_revenue": total_revenue,
                "active_members": active_members,
                "trainer_count": trainer_count,
                "attendance_today": attendance_today,
                "expiring": expiring
            }
        }

    except Exception:
        frappe.log_error(frappe.get_traceback(), "Admin Dashboard Error")
        return {
            "status": "error",
            "message": "Server Error"
        }