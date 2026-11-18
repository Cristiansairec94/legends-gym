frappe.ready(function() {
	// bind events here

	// frappe.web_form.after_load = async () => {
	// 	// frappe.msgprint('Please fill all values carefully');
	// 	let reply_message = await frappe.call({
	// 		method: "gym_management.gym_management.web_form.gym_trainer_rating.gym_trainer_rating.print_msg", //dotted path to server method
	// 		args: {
	// 			"test_arg":"Testing",
	// 		},
	// 		callback: function(r) {
	// 			// code snippet
	// 			console.log(r.message)
	// 		}
	// 	});

	// }

	// frappe.web_form.on('rating', async (field, value) => {
	// // 	let reply_message = await frappe.call({
	// // 		method: "gym_management.gym_management.web_form.gym_trainer_rating.gym_trainer_rating.check_picture", //dotted path to server method
	// // 		args: {
	// // 			"gym_trainer":"Gym Trainer",
	// // 			"value": "gym_trainer" //frappe.web_form.get_value("gym_trainer"),
	// // 		},
	// // 		callback: function(r) {
	// // 			// code snippet
	// // 			console.log(r.message)
	// // 		}		
	// // 	})
	// });

	function getElementByXpath(path) {
		return document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
	}

	frappe.web_form.after_load = () => {
		const img1 = document.createElement("img");
		img1.id = "img1"
		// img1.src = "/files/Man 1.jpg/100/200"
		const find_ele = getElementByXpath("//html/body/div[1]/div/main/div[2]/div/div/div[2]/div/div[2]/div/div/div/form/div[4]/div/div[2]/div[1]")
		find_ele.src = "/files/Man 1.jpg"
		find_ele.append(img1)

		frappe.web_form.on('gym_trainer', async () => {
			let field = frappe.web_form.get_value("gym_trainer")
			console.log("Test")
			let reply_message = await frappe.call({
				method: "gym_management.gym_management.web_form.gym_trainer_rating_form.gym_trainer_rating_form.check_picture",
				args: {
					"gym_trainer": field,
				},
				callback: function(r) {
					// code snippet
					let pict_str = r.message
					const img = document.getElementById("img1"); 
					img.src = pict_str;
				}
			})
		});

		frappe.web_form.after_save = async () => {
			console.log("saved")
			let gym_trainer = frappe.web_form.get_value("gym_trainer")
			let reply_message = await frappe.call({
				method: "gym_management.gym_management.web_form.gym_trainer_rating_form.gym_trainer_rating_form.check_rating",
				args: {
					"gym_trainer": gym_trainer,
				},
				callback: function(r) {
					// code snippet
					let pict_str = r.message
					console.log(pict_str)
				}
			})
		}
		
	}


})