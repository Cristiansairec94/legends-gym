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
def show_table(trg_plan):
	trg_plans = frappe.db.get_all('Gym Training Plan', 
		filters= { 'name' : trg_plan},
		fields= ['training_plan_name', 'trainer', 'name', 'monthly_price'], 
		as_list=True,
	)
	monthly_price = trg_plans[0][3]
    
	# trainer_list = {}
	for record in trg_plans:
		trainer = frappe.db.get_value('Gym Trainer', record[1], 'trainer_name')
	trainer_list = trainer

	# trg_det = {}
	for record in trg_plans:
		trg = frappe.db.get_all('Gym Training Plan Detail', 
			filters= { 'parent' : record[2]},
			fields= ['exercise_name', 'exercise_description', 'start_time', 'duration', 'day'], 
			as_list=True,
		)
		# trg_det[record[2]] = trg
		trg_det = trg
	return monthly_price, trainer_list, trg_det
