# Copyright (c) 2015, Frappe Technologies Pvt. Ltd. and Contributors
# MIT License. See license.txt

from __future__ import unicode_literals

import frappe
import frappe.www.list
from frappe import _

no_cache = 1

def get_context(context):

    # Use get_all to bypass permission checks
    data_list = frappe.db.get_all('Gym Membership', 
      fields= ['membership_type', 'annual_price', 'free_access_hours', 'excess_hours_charging_rate'], 
      as_list=True
	  )
    context.data = list(data_list)
    frappe.msgprint(
      msg='This file does not exist',
      title='Error',
      raise_exception=FileNotFoundError
    )
    # i = 0
    # data = []
    # for data1 in data_list:
    #     i=i+1
    #     data2.index = i
    #     frappe.msgprint("Test")
    #     data2.membership_type = data1.membership_type
    #     data2.annual_price = data1.annual_price
    #     data2.free_access_hours = data1.free_access_hours
    #     data2.excess_hours_charging_rate = data1.excess_hours_charging_rate
    #     data.append(data2)
    # context.data = data
    # return data

    