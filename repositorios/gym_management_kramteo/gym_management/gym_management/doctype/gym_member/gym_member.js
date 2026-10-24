// Copyright (c) 2023, MT and contributors
// For license information, please see license.txt

frappe.ui.form.on('Gym Member', {
	// refresh: function(frm) {
		date_of_subscription : function(frm) {
			frm.set_value('date_of_membership_expiry', frappe.datetime.add_days(frm.doc.date_of_subscription, +365));
			console.log(frm.doc.date_of_subscription);
		}	
	// }
});
