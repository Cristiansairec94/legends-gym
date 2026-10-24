import frappe
from frappe.utils import (
    today,
    add_days,
    date_diff
)


@frappe.whitelist(allow_guest=True)
def get_dashboard_stats():
    try:

        active_members = frappe.db.count(
            "Gym Member",
            {"status": "Active"}
        )

        trainers = frappe.db.count("Trainer")

        active_plans = frappe.db.count(
            "Membership Plan",
            {"is_active": 1}
        )

        return {
            "status": "success",
            "data": {
                "active_members": active_members,
                "trainers": trainers,
                "plans": active_plans
            }
        }

    except Exception:
        frappe.log_error(frappe.get_traceback(), "Dashboard Stats Error")
        return {"status": "error"}
    



@frappe.whitelist(allow_guest=True)
def get_membership_plans(page=1, page_length=3):

    try:

        page = int(page or 1)
        page_length = int(page_length or 3)
        start = (page - 1) * page_length

        plans = frappe.get_all(
            "Membership Plan",
            filters={"is_active": 1},
            fields=[
                "name",
                "plan_name",
                "duration_type",
                "duration_days",
                "amount",
                "grace_period",
                "allowed_freeze_days"
            ],
            order_by="amount asc",
            limit_start=start,
            limit_page_length=page_length
        )

        total = frappe.db.count("Membership Plan", {"is_active": 1})

        return {
            "status": "success",
            "data": plans,
            "total": total,
            "page": page,
            "page_length": page_length
        }

    except Exception:
        frappe.log_error(frappe.get_traceback(), "Plans Pagination Error")
        return {"status": "error"}
    



@frappe.whitelist(allow_guest=True)
def get_plan_details(plan):

    try:

        doc = frappe.get_doc("Membership Plan", plan)

        return {
            "status": "success",
            "data": doc
        }

    except Exception:
        frappe.log_error(frappe.get_traceback(), "Plan Detail Error")

        return {
            "status": "error",
            "message": "Plan not found"
        }
    




@frappe.whitelist(allow_guest=True)
def get_payment_page_data(plan):

    try:

        if frappe.session.user == "Guest":
            return {
                "status": "guest"
            }

        user = frappe.session.user

        member = frappe.db.get_value(
            "Gym Member",
            {"email": user},
            "name"
        )

        if not member:
            return {
                "status": "error",
                "message": "Gym Member not found"
            }

        plan_doc = frappe.get_doc(
            "Membership Plan",
            plan
        )

        return {
            "status": "success",
            "data": {
                "member": member,
                "plan": plan_doc.name,
                "plan_name": plan_doc.plan_name,
                "amount": plan_doc.amount,
                "duration_type": plan_doc.duration_type,
                "duration_days": plan_doc.duration_days
            }
        }

    except Exception:

        frappe.log_error(
            frappe.get_traceback(),
            "Payment Page Error"
        )

        return {
            "status": "error"
        }





@frappe.whitelist(allow_guest=True)
def create_payment(plan):

    try:

        
        if frappe.session.user == "Guest":
            return {
                "status": "guest",
                "message": "Login required"
            }

        user = frappe.session.user

        
        member = frappe.db.get_value(
            "Gym Member",
            {"email": user},
            "name"
        )

        if not member:
            return {
                "status": "error",
                "message": "Member not found"
            }

        
        existing_membership = frappe.db.exists(
            "Gym Membership",
            {
                "member": member,
                "status": "Active"
            }
        )

        if existing_membership:
            return {
                "status": "already_active",
                "message": "You already have an active membership"
            }

        
        plan_doc = frappe.get_doc("Membership Plan", plan)

        start_date = today()
        end_date = add_days(start_date, plan_doc.duration_days)
        remaining_days = date_diff(end_date, start_date)

        
        membership = frappe.get_doc({
            "doctype": "Gym Membership",
            "member": member,
            "membership_plan": plan_doc.name,
            "start_date": start_date,
            "end_date": end_date,
            "remaining_days": remaining_days,
            "status": "Active",
            "total_amount": plan_doc.amount
        })

        membership.insert(ignore_permissions=True)
        membership.submit()

        
        payment = frappe.get_doc({
            "doctype": "Gym Payment",
            "member": member,
            "membership": membership.name,
            "total_amount": plan_doc.amount,
            "paid_amount": plan_doc.amount,
            "outstanding_amount": 0,
            "due_date": today(),
            "status": "Paid",

            
            "payment_history": [
                {
                    "date_vjow": today(),
                    "amount": plan_doc.amount,
                    "payment_mode": "Card",
                    "reference_number": frappe.generate_hash(length=10)
                }
            ]
        })

        payment.insert(ignore_permissions=True)
        payment.submit()

        frappe.db.commit()

        return {
            "status": "success",
            "payment": payment.name,
            "membership": membership.name
        }

    except Exception:
        frappe.log_error(
            frappe.get_traceback(),
            "Create Payment Error"
        )

        return {
            "status": "error",
            "message": "Server error"
        }
    




@frappe.whitelist(allow_guest=False)
def get_my_membership():

    try:
        user = frappe.session.user

        member = frappe.db.get_value(
            "Gym Member",
            {"email": user},
            "name"
        )

        if not member:
            return {"status": "error", "message": "Member not found"}

        current = frappe.db.get_value(
            "Gym Membership",
            {
                "member": member,
                "status": "Active"
            },
            ["name", "membership_plan", "start_date", "end_date", "status"],
            as_dict=True
        )

        history = frappe.get_all(
            "Gym Membership",
            filters={"member": member},
            fields=["name", "membership_plan", "start_date", "end_date", "status", "total_amount" ],
            order_by="creation desc"
        )

        return {
            "status": "success",
            "current": current,
            "history": history
        }

    except Exception:
        frappe.log_error(frappe.get_traceback(), "Get Membership Error")
        return {"status": "error"}





@frappe.whitelist()
def upgrade_membership(member, new_plan):

    try:

        plan = frappe.get_doc("Membership Plan", new_plan)

        old = frappe.get_all(
            "Gym Membership",
            filters={"member": member, "status": "Active"},
            fields=["name"]
        )

        for m in old:
            doc = frappe.get_doc("Gym Membership", m.name)
            doc.status = "Completed"
            doc.save()

        start_date = today()
        end_date = add_days(start_date, plan.duration_days)

        membership = frappe.get_doc({
            "doctype": "Gym Membership",
            "member": member,
            "membership_plan": plan.name,
            "start_date": start_date,
            "end_date": end_date,
            "status": "Active",
            "total_amount": plan.total_amount
        })

        membership.insert()
        membership.submit()

        return {
            "status": "success",
            "membership": membership.name
        }

    except Exception:
        frappe.log_error(frappe.get_traceback(), "Upgrade Error")
        return {"status": "error"}
    




@frappe.whitelist(allow_guest=True)
def get_trainers(page=1, page_length=4):

    try:

        page = int(page)
        page_length = int(page_length)

        start = (page - 1) * page_length

        trainers = frappe.get_all(
            "Trainer",
            fields=[
                "name",
                "trainer_name",
                "specialization",
                "experience"
            ],
            limit_start=start,
            limit_page_length=page_length,
            order_by="creation desc"
        )

        total = frappe.db.count("Trainer")

        return {
            "status": "success",
            "data": trainers,
            "total": total
        }

    except Exception:
        frappe.log_error(frappe.get_traceback(), "Trainer Pagination Error")
        return {"status": "error"}
    



@frappe.whitelist(allow_guest=False)
def get_payment_history(page=1, page_length=5):

    user = frappe.session.user

    member = frappe.db.get_value("Gym Member", {"email": user}, "name")

    if not member:
        return {"status": "error", "message": "Member not found"}

    page = int(page)
    page_length = int(page_length)
    start = (page - 1) * page_length

    data = frappe.get_all(
        "Gym Payment",
        filters={"member": member},
        fields=["name", "paid_amount", "status", "creation"],
        limit_start=start,
        limit_page_length=page_length,
        order_by="creation desc"
    )

    total = frappe.db.count("Gym Payment", {"member": member})

    return {
        "status": "success",
        "data": data,
        "total": total
    }



@frappe.whitelist(allow_guest=True)
def get_trainer_details(id):

    try:

        trainer = frappe.get_doc("Trainer", id)

        return {
            "status": "success",
            "data": {
                "trainer_name": trainer.trainer_name,
                "specialization": trainer.role,
                "experience": trainer.experience,
                "about": trainer.about,
                "specialties": trainer.specialties,
                "certifications": trainer.certifications,
                "availability": trainer.availability,
                "session_rate": trainer.session_rate
            }
        }

    except Exception:
        frappe.log_error(frappe.get_traceback(), "Trainer Details Error")
        return {"status": "error"}
    






@frappe.whitelist()
def get_profile():

    try:

        if frappe.session.user == "Guest":
            return {
                "status": "guest"
            }

        user = frappe.session.user

        member_name = frappe.db.get_value(
            "Gym Member",
            {"email": user},
            "name"
        )

        if not member_name:

            return {
                "status": "error",
                "message": "Gym Member not found"
            }

        member = frappe.get_doc(
            "Gym Member",
            member_name
        )

        membership = frappe.db.get_value(
            "Gym Membership",
            {
                "member": member.name,
                "status": "Active"
            },
            [
                "membership_plan",
                "start_date"
            ],
            as_dict=True
        )

        total_paid = frappe.db.sql("""
            SELECT SUM(paid_amount)
            FROM `tabGym Payment`
            WHERE member=%s
        """, (member.name))[0][0] or 0

        membership_count = frappe.db.count(
            "Gym Membership",
            {
                "member": member.name
            }
        )

        active_days = 0

        if membership and membership.get("start_date"):

            active_days = date_diff(
                today(),
                membership.get("start_date")
            )

        return {

            "status": "success",

            "data": {

                "full_name":
                    member.member_name or "",

                "email":
                    member.email or "",

                "phone":
                    member.mobile_number or "",

                "date_of_birth":
                    member.dob or "",

                "address":
                    member.address or "",

                "membership_plan":
                    membership.get("membership_plan")
                    if membership else "No Active Plan",

                "stats": {

                    "active_days":
                        active_days,

                    "membership_count":
                        membership_count,

                    "total_paid":
                        total_paid,

                    "current_plan":
                        membership.get("membership_plan")
                        if membership else "-"

                }

            }

        }

    except Exception:

        frappe.log_error(
            frappe.get_traceback(),
            "Get Profile Error"
        )

        return {
            "status": "error"
        }


@frappe.whitelist()
def update_profile(
    full_name,
    phone=None,
    date_of_birth=None,
    address=None
):

    try:

        if frappe.session.user == "Guest":
            return {
                "status": "guest"
            }

        user = frappe.session.user

        member_name = frappe.db.get_value(
            "Gym Member",
            {"email": user},
            "name"
        )

        if not member_name:

            return {
                "status": "error",
                "message": "Member not found"
            }

        member = frappe.get_doc(
            "Gym Member",
            member_name
        )

        member.member_name = full_name
        member.mobile_number = phone
        member.dob = date_of_birth
        member.address = address

        member.save(ignore_permissions=True)

        frappe.db.commit()

        return {
            "status": "success",
            "message": "Profile updated"
        }

    except Exception:

        frappe.log_error(
            frappe.get_traceback(),
            "Update Profile Error"
        )

        return {
            "status": "error"
        }