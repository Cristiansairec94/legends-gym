import frappe


@frappe.whitelist()
def get_my_training_schedule():

    try:

        if frappe.session.user == "Guest":
            return {
                "status": "guest"
            }

        member = frappe.db.get_value(
            "Gym Member",
            {
                "email": frappe.session.user
            },
            "name"
        )

        if not member:

            return {
                "status": "error",
                "message": "Member not found"
            }

        schedules = frappe.get_all(
            "Training Schedule",
            filters={
                "member": member
            },
            fields=[
                "name",
                "trainer",
                "trainer_type",
                "workout_type",
                "start_time",
                "end_time",
                "attendance_status"
            ],
            order_by="creation desc"
        )

        for s in schedules:

            days = frappe.get_all(
                "Assigned Days",
                filters={
                    "parent": s.name,
                    "parenttype": "Training Schedule"
                },
                fields=["day"]
            )

            s["days"] = [
                d.day for d in days
            ]

        return {
            "status": "success",
            "data": schedules
        }

    except Exception:

        frappe.log_error(
            frappe.get_traceback(),
            "Training Schedule Error"
        )

        return {
            "status": "error",
            "message": "Server Error"
        }