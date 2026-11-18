frappe.pages['gym-membership-types'].on_page_load = async function(wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'Gym Membership Types',
		single_column: true
	});

	page.set_title("Gym Membership Types")

	let gym_membership = await frappe.db.get_list('Gym Membership', {fields: ['membership_type', 'annual_price', 'free_access_hours', 'excess_hours_charging_rate'] })
	// let gym_membership = await get_membership_details()

	$(frappe.render_template("gym_membership_types", {
		data : gym_membership
	})).appendTo(page.body);
	
}