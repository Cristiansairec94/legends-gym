import frappe
from frappe.model.document import Document
from frappe.utils import time_diff_in_hours


class TrainingSchedule(Document):

    def validate(self):

        self.validate_times()
        self.validate_trainer_schedule()
        self.calculate_duration()
        self.update_pt_session_count()

    def validate_times(self):

        if (
            self.start_time
            and self.end_time
            and self.end_time <= self.start_time
        ):

            frappe.throw(
                "End Time must be greater than Start Time"
            )

    def validate_trainer_schedule(self):

        if not self.trainer:
            return

        existing = frappe.db.exists(
            "Training Schedule",
            {
                "trainer": self.trainer,
                "start_time": self.start_time,
                "docstatus": ["!=", 2],
                "name": ["!=", self.name]
            }
        )

        if existing:

            frappe.throw(
                "Trainer already assigned for this time slot"
            )

    def calculate_duration(self):

        if self.start_time and self.end_time:

            self.duration = time_diff_in_hours(
                self.end_time,
                self.start_time
            )

    def update_pt_session_count(self):

        if not self.trainer_type:
            return

        trainer_type = frappe.db.get_value(
            "Trainer Type",
            self.trainer_type,
            "trainer_type_name"
        )

        if trainer_type != "Personal Training (PT)":
            return

        if not self.trainer:
            return

        trainer = frappe.get_doc(
            "Trainer",
            self.trainer
        )

        trainer.pt_session_count = (
            trainer.pt_session_count or 0
        ) + 1

        trainer.save(ignore_permissions=True)