# Copyright (c) 2015, Frappe Technologies Pvt. Ltd. and Contributors
# MIT License. See license.txt

from __future__ import unicode_literals

import frappe
import frappe.www.list
from frappe import _

no_cache = 1

def get_context(context):
    # Use get_all to bypass permission checks
    context.trg_plan = frappe.db.get_all('Gym Training Plan', 
        fields= ['training_plan_name', 'trainer', 'name'], 
        as_list=True,
        )
    
    trainer_list = {}
    for record in context.trg_plan:
        trainer = frappe.db.get_value('Gym Trainer', record[1], 'trainer_name')
        trainer_list[record[1]] = trainer
    context.trainer = trainer_list

    trg_det = {}
    for record in context.trg_plan:
        trg = frappe.db.get_all('Gym Training Plan Detail', 
            filters= { 'parent' : record[2]},
            fields= ['exercise_name', 'exercise_description', 'start_time', 'duration', 'day'], 
            as_list=True,
        )
        trg_det[record[2]] = trg
    context.trg_det = trg_det

