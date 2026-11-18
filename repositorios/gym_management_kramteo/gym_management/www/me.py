# Copyright (c) 2015, Frappe Technologies Pvt. Ltd. and Contributors
# MIT License. See license.txt

from __future__ import unicode_literals

import frappe
import frappe.www.list
from frappe import _

no_cache = 1


def get_context(context):
	if frappe.session.user == "Guest":
		frappe.throw(_("You need to be logged in to access this page"), frappe.PermissionError)

	context.show_sidebar = True
	context.data = frappe.db.get_list('Gym Membership', 
		fields= ['membership_type', 'annual_price', 'free_access_hours', 'excess_hours_charging_rate'], 
		as_list=True
	)
