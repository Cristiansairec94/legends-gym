# Copyright (c) 2026, Ajmal Kp and contributors

import frappe
from frappe.model.document import Document
from frappe.utils import (
    add_days,
    date_diff,
    nowdate,
    add_months
)


class GymMembership(Document):

    def validate(self):

        self.fetch_plan_details()
        self.calculate_end_date()
        self.validate_freeze_days()
        self.calculate_remaining_days()
        self.update_status()

    def fetch_plan_details(self):

        if self.membership_plan:

            plan = frappe.get_doc(
                "Membership Plan",
                self.membership_plan
            )

            self.total_amount = plan.amount

    def calculate_end_date(self):

        if not self.start_date or not self.membership_plan:
            return

        plan = frappe.get_doc(
            "Membership Plan",
            self.membership_plan
        )

        if plan.duration_type == "Monthly":

            end_date = add_months(
                self.start_date,
                1
            )

        elif plan.duration_type == "Quarterly":

            end_date = add_months(
                self.start_date,
                3
            )

        elif plan.duration_type == "Half-Yearly":

            end_date = add_months(
                self.start_date,
                6
            )

        elif plan.duration_type == "Yearly":

            end_date = add_months(
                self.start_date,
                12
            )

        else:

            end_date = self.start_date

        total_freeze_days = 0

        for row in self.freeze_history:

            freeze_days = date_diff(
                row.freeze_end_date,
                row.freeze_start_date
            )

            row.freeze_days = freeze_days

            total_freeze_days += freeze_days

        self.end_date = add_days(
            end_date,
            total_freeze_days
        )

    def validate_freeze_days(self):

        settings = frappe.get_single(
            "Gym Settings"
        )

        allowed_days = (
            settings.max_freeze_days or 0
        )

        total_freeze_days = 0

        for row in self.freeze_history:

            freeze_days = date_diff(
                row.freeze_end_date,
                row.freeze_start_date
            )

            total_freeze_days += freeze_days

        if total_freeze_days > allowed_days:

            frappe.throw(
                f"Maximum allowed freeze days is {allowed_days}"
            )

    def calculate_remaining_days(self):

        if self.end_date:

            self.remaining_days = date_diff(
                self.end_date,
                nowdate()
            )

    def update_status(self):

        if not self.end_date:
            return

        if self.remaining_days <= 0:

            self.status = "Expired"

        elif self.docstatus == 0:

            self.status = "Draft"

        else:

            self.status = "Active"