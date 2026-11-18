# Copyright (c) 2023, MT and Contributors
# See license.txt

import frappe
import unittest

from gym_management.gym_management.doctype.gym_locker_booking.gym_locker_booking import GetHour, validate_locker_availability

class TestGymLockerBooking(unittest.TestCase):
	def test_subroutine(self):
		self.assertIsInstance(GetHour("12:00:00"), int)

	def test_return_value(self):
		self.assertTrue(validate_locker_availability("MBR-2302-004", "10-02-2023", "2:00:00", "3:00:00"))

if __name__ == '__main__':
	unittest.main()