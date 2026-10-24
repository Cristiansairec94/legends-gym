import frappe

from frappe.utils import (
    today,
    
    date_diff,
    getdate
)


# Membership Expiry Check
def update_membership_status():

    memberships = frappe.get_all(
        "Gym Membership",
        filters={
            "status": ["in", ["Active", "Frozen"]]
        },
        fields=[
            "name",
            "end_date"
        ]
    )

    for membership in memberships:

        if not membership.end_date:
            continue

        if getdate(membership.end_date) < getdate(today()):

            frappe.db.set_value(
                "Gym Membership",
                membership.name,
                "status",
                "Expired"
            )


# Payment Overdue Check
def update_overdue_payments():

    payments = frappe.get_all(
        "Gym Payment",
        filters={
            "status": ["in", ["Unpaid", "Partially Paid"]]
        },
        fields=[
            "name",
            "due_date",
            "outstanding_amount"
        ]
    )

    for payment in payments:

        if (
            payment.due_date
            and payment.outstanding_amount > 0
        ):

            if getdate(today()) > getdate(payment.due_date):

                frappe.db.set_value(
                    "Gym Payment",
                    payment.name,
                    "status",
                    "Overdue"
                )


def expiry_notifications():

    settings = frappe.get_single(
        "Gym Settings"
    )

    reminder_days = (
        settings.membership_reminder_days or 7
    )

    memberships = frappe.get_all(
        "Gym Membership",
        filters={
            "status": "Active"
        },
        fields=[
            "name",
            "member",
            "member_name",
            "end_date"
        ]
    )

    for membership in memberships:

        if not membership.end_date:
            continue

        remaining_days = date_diff(
            membership.end_date,
            today()
        )

        if remaining_days != reminder_days:
            continue

        member = frappe.db.get_value(
            "Gym Member",
            membership.member,
            ["email", "full_name"],
            as_dict=True
        )

        if (
            not member
            or not member.email
        ):
            continue

        frappe.sendmail(
            recipients=[member.email],
            subject="Membership Expiry Reminder",
            message=f"""
                Dear {member.full_name},

                Your membership will expire on
                {membership.end_date}.

                Please renew your membership.
            """
        )


def validate_freeze_period():

    memberships = frappe.get_all(
        "Gym Membership",
        filters={
            "status": "Frozen"
        },
        fields=[
            "name",
            "freeze_end_date"
        ]
    )

    for membership in memberships:

        if not membership.freeze_end_date:
            continue

        if (
            getdate(today())
            > getdate(membership.freeze_end_date)
        ):

            frappe.db.set_value(
                "Gym Membership",
                membership.name,
                "status",
                "Active"
            )



def update_dashboard_stats():
    total_members = frappe.db.count("Gym Member") 
    active_memberships = frappe.db.count( 
        "Gym Membership", 
        {"status": "Active"} 
        ) 
    expired_memberships = frappe.db.count( 
        "Gym Membership", 
        {"status": "Expired"} 
        ) 
    frappe.cache().set_value("gym_dashboard_stats", { 
        "total_members": total_members, 
        "active_memberships": active_memberships, 
        "expired_memberships": expired_memberships 
        }) 
    frappe.db.commit()