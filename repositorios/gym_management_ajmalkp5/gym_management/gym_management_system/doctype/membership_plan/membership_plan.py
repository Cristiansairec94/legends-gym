# Copyright (c) 2026, Ajmal Kp and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document

class MembershipPlan(Document):

    def validate(self):

        self.set_duration_days()
        self.validate_amount()

    def set_duration_days(self):

        mapping = {
            "Monthly": 30,
            "Quarterly": 90,
            "Half-Yearly": 180,
            "Yearly": 365
        }

        self.duration_days = mapping.get(
            self.duration_type
        )

        

    def validate_amount(self):

        if not self.amount:
            frappe.throw("Amount is required")

        if self.amount <= 0:
            frappe.throw("Amount must be greater than 0")