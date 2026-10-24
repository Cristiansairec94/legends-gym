# Copyright (c) 2026, Ajmal Kp and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document

class GymMember(Document):

    def validate(self):

        self.validate_mobile()

    def validate_mobile(self):

        if self.mobile_number:

            if len(self.mobile_number) != 10:
                frappe.throw("Mobile number must be 10 digits")
