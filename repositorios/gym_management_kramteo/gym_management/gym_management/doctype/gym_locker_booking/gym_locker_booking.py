# Copyright (c) 2023, MT and contributors
# For license information, please see license.txt

from datetime import datetime # from python std library
import frappe
from frappe.website.website_generator import WebsiteGenerator

class GymLockerBooking(WebsiteGenerator):
	pass

@frappe.whitelist()
def validate_locker_availability(booking_name,booking_date, booking_start_time, booking_end_time):
	#frappe.msgprint(str(booking_date) + " start " + str(booking_start_time) + " end " + str(booking_end_time))
	no_of_locker = int(frappe.db.get_single_value("Gym Locker Details", "no_of_lockers"))
	start_hour = GetHour(booking_start_time)
	end_hour = GetHour(booking_end_time)
	booking_list = frappe.db.get_list("Gym Locker Booking", filters={'date_of_booking': booking_date}, fields=['start_time', 'end_time'])
	count_booking = 0
	for booking_item in booking_list:
		if (booking_item.name != booking_name):
			item_start_time = GetHour(str(booking_item.start_time))
			item_end_time = GetHour(str(booking_item.end_time))
			#frappe.msgprint(str(item_start_time) + " and " + str(item_end_time))
			if ((item_start_time>=start_hour and item_start_time<=end_hour) or (item_end_time>=start_hour and item_end_time<=end_hour)):
				count_booking +=1
	#frappe.msgprint(str(count_booking))
	if (count_booking<=no_of_locker):
		ret_val = True
	else:
		ret_val = False
	return ret_val

def GetHour(time_str):
	#frappe.msgprint(time_str)
	num_str = time_str[0:time_str.find(":")]
	num_int = int(num_str)
	return num_int
