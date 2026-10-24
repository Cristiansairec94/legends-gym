@frappe.whitelist()
def get_membership_details():
    return frappe.db.get_list('Gym Membership', {fields: ['membership_type', 'annual_price', 'free_access_hours', 'excess_hours_charging_rate'] })