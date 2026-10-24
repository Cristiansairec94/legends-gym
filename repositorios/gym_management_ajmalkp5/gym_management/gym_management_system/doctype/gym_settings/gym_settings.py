# Copyright (c) 2026, Ajmal Kp and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class GymSettings(Document):

    def validate(self):

        if (
            self.gym_open_time
            and self.gym_close_time
            and self.gym_open_time >= self.gym_close_time
        ):

            frappe.throw(
                "Gym Close Time must be greater than Open Time"
            )
