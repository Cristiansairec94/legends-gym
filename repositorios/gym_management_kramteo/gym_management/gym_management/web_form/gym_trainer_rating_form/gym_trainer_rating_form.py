from __future__ import unicode_literals

import frappe

def get_context(context):
	# do your magic here
	pass

@frappe.whitelist()
def print_msg(test_arg):
	frappe.msgprint("Testing")
	return True

@frappe.whitelist()
def check_picture(gym_trainer):
	check_exist = frappe.db.exists('Gym Trainer', gym_trainer)
	if (check_exist != None) :
		picture = frappe.db.get_value('Gym Trainer', check_exist, 'picture')
	else:
		picture = "Not Found!"
	# print_msg("Test")
	# frappe.msgprint(check_exist + ' test')
	return picture

@frappe.whitelist()
def check_rating(gym_trainer):
	check_exist = frappe.db.exists('Gym Trainer', gym_trainer)
	if (check_exist != None) :
		ratings = frappe.db.get_list('Gym Trainer Rating', 
			filters = {
				'gym_trainer' : check_exist
			},
			fields = ['rating', 'date_of_rating']
		)
		trainer_rating = 0
		rating_count = 0
		for rating in ratings :
			rating_count +=1
			trainer_rating += determine_rating(rating.rating)
		overall_rating = trainer_rating / rating_count
		frappe.db.set_value('Gym Trainer', gym_trainer, 'grading', overall_rating)
		frappe.db.set_value('Gym Trainer', gym_trainer, 'no_of_grading', rating_count)
	# frappe.msgprint(str(overall_rating) + ' , ' + str(rating_count))
	

def determine_rating(rating):
	return_value = 0
	if (rating=="1. Excellent"):
			return_value = 5
	elif (rating=="2. Very Good"):
			return_value = 4
	elif (rating=="3. Good"):
			return_value = 3
	elif (rating=="4. Average"):
			return_value = 2
	elif (rating=="5. Poor"):
			return_value = 1
	if (return_value == 0):
		frappe.msgprint("Error - unknown rating!")
	return return_value