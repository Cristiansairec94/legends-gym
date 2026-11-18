# Copyright (c) 2026, Ajmal Kp

import frappe
from frappe.model.document import Document
from frappe.utils import (
    nowdate,
    getdate,
    add_months
)


class GymPayment(Document):

    def validate(self):

        self.fetch_membership_details()
        self.calculate_due_date()
        self.calculate_paid_amount()
        self.calculate_outstanding()
        self.set_status()

    def fetch_membership_details(self):

        if not self.membership:
            return

        membership = frappe.get_doc(
            "Gym Membership",
            self.membership
        )

        self.member = membership.member
        self.membership_plan = membership.membership_plan

        if membership.membership_plan:

            plan = frappe.get_doc(
                "Membership Plan",
                membership.membership_plan
            )

            self.total_amount = plan.amount

    def calculate_due_date(self):

        if not self.payment_date:
            return

        if not self.membership_plan:
            return

        plan = frappe.get_doc(
            "Membership Plan",
            self.membership_plan
        )

        if plan.duration_type == "Monthly":

            self.due_date = add_months(
                self.payment_date,
                1
            )

        elif plan.duration_type == "Quarterly":

            self.due_date = add_months(
                self.payment_date,
                3
            )

        elif plan.duration_type == "Yearly":

            self.due_date = add_months(
                self.payment_date,
                12
            )

    def calculate_paid_amount(self):

        total = 0

        for row in self.payment_history:

            total += row.amount or 0

        self.paid_amount = total

    def calculate_outstanding(self):

        total_amount = self.total_amount or 0
        paid_amount = self.paid_amount or 0

        self.outstanding_amount = (
            total_amount - paid_amount
        )

    def set_status(self):

        if self.outstanding_amount <= 0:

            self.status = "Paid"

        elif self.paid_amount > 0:

            self.status = "Partially Paid"

        else:

            self.status = "Unpaid"

        if (
            self.due_date
            and getdate(self.due_date)
            < getdate(nowdate())
            and self.outstanding_amount > 0
        ):

            self.status = "Overdue"