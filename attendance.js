
const {
    Attendance
} = require("./src/app/modules/Attandance/models/attandance.model");
const { User } = require('./src/app/modules/user/models/user.model');

const mongoose = require("mongoose");
const { Leaves } = require("../../Leaves/models/leaves.model")
const leaveApplicationSchema = new mongoose.Schema({
    date: Date,
    status: {
        type: String,
        enum: ['Applied', 'Rejected', 'Accepted', 'Cancel'],
        default: 'Applied'
    },
    reason: String,
    leaveType: {
        type: String,
        enum: ['Maternity Leave', 'Casual Leave', 'Compensatory Off', 'Marriage Leave', 'Short Leave', 'Others']
    },
    CanceledBy: String,
    ApprovedBy: String,
}, {
    versionKey: false
});

// attendance //
const AttendanceSchema = new mongoose.Schema({
    userId: {
        type: Number,
        ref: 'User'
    },
    teacherId: {
        type: Number,
        ref: 'User'
    },
    supportStaff: {
        type: Number,
        ref: 'User'
    },
    details: [],

    employeeId: {
        type: Number,
        ref: 'User'
    },
    schoolId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'School'
    },
    classId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Class'
    },
    approvedBy: {
        type: Number,
        ref: 'User'
    },
    attendanceUpdateBy: {
        type: Number,
        ref: 'User'
    },
    sectionId: { /* Define the properties or type if needed */ },
    status: [{
        day: {
            type: Date,
            default: new Date('1970-01-01T12:46:56.197+00:00')
        },
        punchOutTime: Date,
        status: {
            type: String,
            enum: ['Not Marked', 'Holiday', 'Present', 'Absent', 'Leave'],
            default: "Not Marked"
        },

    }],
    leaveApplication: [leaveApplicationSchema],
    totalNumberOfAvliableLeave: { type: Number, default: 0 },
    totalNumberOfLeave: { type: Number, default: 0 }
}, {
    timestamps: true,
    versionKey: false
});

const Attendance = mongoose.model("Attendance", AttendanceSchema);
Attendance.syncIndexes();

module.exports = { Attendance };

// model of attendance and api for as by default not mark of student and teacher and employee





const markAttendanceByDefaultStatusAsNotMarked = async () => {
    try {
        console.log('Attendance job started.');
        const students = await User.find({ roleId: 0 });
        if (!students || students.length === 0) {
            console.log('No students found.');
            return;
        }
        const currentDate = new Date();
        currentDate.setUTCHours(0, 0, 0, 0);
        const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        for (const student of students) {
            let attendance = await Attendance.findOne({ userId: student._id });
            const obj = {
                firstName: student.firstName,
                lastName: student.lastName,
                DOB: student.DOB,
                email: student.email,
                address: student.address,
                fatherInfo: student.fatherInfo,
                motherInfo: student.motherInfo
            };
            if (!attendance) {
                attendance = new Attendance({
                    details: [obj],
                    userId: student._id,
                    schoolId: student.school,
                    classId: student.class,
                    sectionId: student.section,
                    status: [{ day: currentDate, status: 'Not Marked' }],
                    leaveApplication: []
                });
                await attendance.save();
                console.log(`Attendance record created and marked as "Not Marked" for student: ${student.firstName} ${student.lastName}`);
            } else {
                const existingStatusTodayIndex = attendance.status.findIndex(status => {
                    const statusDate = new Date(status.day);
                    return statusDate.toDateString() === currentDate.toDateString();
                });
                if (existingStatusTodayIndex === -1) {
                    attendance.status.push({ day: currentDate, status: 'Not Marked' });
                    await attendance.save();
                    console.log(`Attendance marked as "Not Marked" for student: ${student.firstName} ${student.lastName}`);
                } else {
                    if (attendance.status.length > 1) {
                        attendance.status.splice(existingStatusTodayIndex, 1);
                        await attendance.save();
                        console.log(`Duplicate attendance record deleted for student: ${student.firstName} ${student.lastName}`);
                    }
                }
            }
            // Check if attendance hasn't been marked for any days from the start of the month until today and mark as absent
            if (currentDate.getMonth() === firstDayOfMonth.getMonth() && currentDate.getDate() > 1) {
                for (let i = 1; i < currentDate.getDate(); i++) {
                    const dateToCheck = new Date(currentDate.getFullYear(), currentDate.getMonth(), i);
                    const existingStatus = attendance.status.find(status => {
                        const statusDate = new Date(status.day);
                        return statusDate.toDateString() === dateToCheck.toDateString();
                    });

                    if (!existingStatus) {
                        attendance.status.push({ day: dateToCheck, status: 'Absent' });
                        await attendance.save();
                        console.log(`Attendance marked as "Absent" for student: ${student.firstName} ${student.lastName} on ${dateToCheck.toDateString()}`);
                    }
                }
            }
        }
        console.log('Attendance marked as "Not Marked" for all students.');
        console.log("Attendance marked successfully")
    } catch (error) {
        console.error('Error marking attendance:', error);
    }
}


cron.schedule('32 9 * * *', async () => {
    await markAttendanceByDefaultStatusAsNotMarked();
});



const updateAbsentStatus = async () => {
    try {
        console.log('Attendance status update job started.');
        const currentDate = new Date();
        currentDate.setUTCHours(0, 0, 0, 0);
        const students = await User.find({ roleId: 0 });
        if (!students || students.length === 0) {
            console.log('No students found.');
            return;
        }
        for (const student of students) {
            let attendance = await Attendance.findOne({ userId: student._id });
            console.log("attendance=========>>", attendance)
            if (attendance) {
                const existingStatusToday = attendance.status.find(status => {
                    const statusDate = new Date(status.day);
                    return statusDate.toDateString() === currentDate.toDateString();
                });
                if (existingStatusToday) {
                    if (existingStatusToday.status === 'Not Marked') {
                        existingStatusToday.status = 'Absent';
                        await attendance.save();
                        console.log(`Attendance status updated to "Absent" for student: ${student.firstName} ${student.lastName}`);
                    } else {
                        console.log(`Attendance status for student: ${student.firstName} ${student.lastName} is already marked as ${existingStatusToday.status}.`);
                    }
                } else {
                    console.log(`No attendance record found for student: ${student.firstName} ${student.lastName}.`);
                }
            }
        }
        console.log('Attendance status updated for all eligible students.');
    } catch (error) {
        console.error('Error updating attendance status:', error);
    }
};


// Schedule the function to run at 11:58 PM every day
cron.schedule('58 23 * * *', async () => {
    await updateAbsentStatus();
});


const markAttendanceByDefaultStatusAsNotMarkedForTeacher = async () => {
    try {
        console.log('Attendance job started.');
        const students = await User.find({ roleId: 3 });
        if (!students || students.length === 0) {
            console.log('No students found.');
            return;
        }
        const currentDate = new Date();
        currentDate.setUTCHours(0, 0, 0, 0);
        const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        for (const student of students) {
            let attendance = await Attendance.findOne({ teacherId: student._id });
            const obj = {
                firstName: student.firstName,
                lastName: student.lastName,
                DOB: student.DOB,
                email: student.email,
                address: student.address,
                fatherInfo: student.fatherInfo,
                motherInfo: student.motherInfo
            };
            if (!attendance) {
                attendance = new Attendance({
                    details: [obj],
                    teacherId: student._id,
                    schoolId: student.school,
                    classId: student.class,
                    sectionId: student.section,
                    status: [{ day: currentDate, status: 'Not Marked' }],
                    leaveApplication: []
                });
                await attendance.save();
                console.log(`Attendance record created and marked as "Not Marked" for student: ${student.firstName} ${student.lastName}`);
            } else {
                const existingStatusTodayIndex = attendance.status.findIndex(status => {
                    const statusDate = new Date(status.day);
                    return statusDate.toDateString() === currentDate.toDateString();
                });
                if (existingStatusTodayIndex === -1) {
                    attendance.status.push({ day: currentDate, status: 'Not Marked' });
                    await attendance.save();
                    console.log(`Attendance marked as "Not Marked" for Teacher: ${student.firstName} ${student.lastName}`);
                } else {
                    if (attendance.status.length > 1) {
                        attendance.status.splice(existingStatusTodayIndex, 1);
                        await attendance.save();
                        console.log(`Duplicate attendance record deleted for Teacher: ${student.firstName} ${student.lastName}`);
                    }
                }
            }
            // Check if attendance hasn't been marked for any days from the start of the month until today and mark as absent
            if (currentDate.getMonth() === firstDayOfMonth.getMonth() && currentDate.getDate() > 1) {
                for (let i = 1; i < currentDate.getDate(); i++) {
                    const dateToCheck = new Date(currentDate.getFullYear(), currentDate.getMonth(), i);
                    const existingStatus = attendance.status.find(status => {
                        const statusDate = new Date(status.day);
                        return statusDate.toDateString() === dateToCheck.toDateString();
                    });

                    if (!existingStatus) {
                        attendance.status.push({ day: dateToCheck, status: 'Absent' });
                        await attendance.save();
                        console.log(`Attendance marked as "Absent" for student: ${student.firstName} ${student.lastName} on ${dateToCheck.toDateString()}`);
                    }
                }
            }
        }
        console.log('Attendance marked as "Not Marked" for all students.');
        console.log("Attendance marked successfully")
    } catch (error) {
        console.error('Error marking attendance:', error);
    }
}


cron.schedule('35 9 * * *', async () => {
    await markAttendanceByDefaultStatusAsNotMarkedForTeacher();
});



const markAcademicAttendanceByDefaultStatusAsNotMarked = async () => {
    try {
        console.log('Academic attendance job started.');

        // Fetch all students with roleId in the specified range, excluding 0 and 3
        const students = await User.find({
            roleId: { $in: Array.from({ length: 61 }, (_, i) => i + 1).filter(roleId => roleId !== 0 && roleId !== 3) }
        });
        console.log("Number of students found:", students.length);

        if (!students || students.length === 0) {
            console.log('No students found.');
            return;
        }

        // Get the current date without time components (midnight in UTC)
        const currentDate = new Date();
        currentDate.setUTCHours(0, 0, 0, 0);

        // First day of the current month
        const firstDayOfMonth = new Date(currentDate.getUTCFullYear(), currentDate.getUTCMonth(), 1);
        firstDayOfMonth.setUTCHours(0, 0, 0, 0);

        for (const student of students) {
            let attendance = await Attendance.findOne({ supportStaff: student._id });

            const obj = {
                firstName: student.firstName,
                lastName: student.lastName,
                DOB: student.DOB,
                email: student.email,
                address: student.address,
                fatherInfo: student.fatherInfo,
                motherInfo: student.motherInfo
            };

            if (!attendance) {
                attendance = new Attendance({
                    details: [obj],
                    supportStaff: student._id,
                    schoolId: student.school,
                    classId: student.class,
                    sectionId: student.section,
                    status: [],
                    leaveApplication: []
                });
            }

            // Mark attendance from the first day of the month to the current date
            for (let i = 1; i <= currentDate.getUTCDate(); i++) {
                const dateToCheck = new Date(currentDate.getUTCFullYear(), currentDate.getUTCMonth(), i);
                dateToCheck.setUTCHours(0, 0, 0, 0);

                const existingStatusIndex = attendance.status.findIndex(status => {
                    const statusDate = new Date(status.day);
                    statusDate.setUTCHours(0, 0, 0, 0);
                    return statusDate.getTime() === dateToCheck.getTime();
                });

                if (existingStatusIndex === -1) {
                    const status = i === currentDate.getUTCDate() ? 'Not Marked' : 'Absent';
                    attendance.status.push({ day: dateToCheck, status: status });
                    console.log(`Attendance marked as "${status}" for supportStaff: ${student.firstName} ${student.lastName} on ${dateToCheck.toDateString()}`);
                } else {
                    // Remove the duplicate entry if found
                    attendance.status.splice(existingStatusIndex, 1, { day: dateToCheck, status: i === currentDate.getUTCDate() ? 'Not Marked' : 'Absent' });
                    console.log(`Duplicate attendance record updated for supportStaff: ${student.firstName} ${student.lastName} on ${dateToCheck.toDateString()}`);
                }
            }

            await attendance.save();
        }

        console.log('Academic attendance marked as "Not Marked" for all supportStaff.');
    } catch (error) {
        console.error('Error marking academic attendance:', error);
    }
};

cron.schedule('34 12 * * *', async () => {
    await markAcademicAttendanceByDefaultStatusAsNotMarked();
});



const markStudentAttendance = async (user, body) => {
    console.log('user===================', user);
    const currentDate = new Date(body.date);
    currentDate.setUTCHours(0, 0, 0, 0);

    let attendance = await Attendance.findOne({
        userId: body.userId
    });

    if (!attendance) {
        // Create a new attendance record
        const attendanceBody = {
            userId: body.userId,
            schoolId: user.school,
            classId: user.class,
            sectionId: user.section,
            status: [],
            leaveApplication: []  // Initialize leaveApplication array
        };
        attendance = new Attendance(attendanceBody);
    }

    // Check if there is an applied and accepted leave on the current day
    const appliedLeave = (attendance.leaveApplication || []).find(
        (leave) =>
            leave.date.getTime() === currentDate.getTime() &&
            leave.status === 'Accepted'
    );

    if (appliedLeave) {
        return {
            error: "You cannot mark attendance because you have applied for leave."
        };
    }

    // Check if attendance is already marked for the current day
    const alreadyMarked = (attendance.status || []).find(
        (status) => status.day.getTime() === currentDate.getTime()
    );

    if (alreadyMarked) {
        if (alreadyMarked.status === 'Not Marked' || alreadyMarked.status === 'Absent' || alreadyMarked.status === 'Leave' || alreadyMarked.status === 'Present') {
            // Update the status for the already marked attendance entry
            alreadyMarked.status = body.status;
        } else {
            return {
                error: "Attendance is already marked for the current day."
            };
        }
    } else {
        // If attendance is not marked for the current day, push a new entry
        attendance.status.push({
            day: currentDate,
            status: body.status
        });
    }

    // Save the updated attendance record
    const updatedAttendance = await attendance.save();

    if (!updatedAttendance) {
        return {
            error: "Error saving attendance record."
        };
    }

    // Return the relevant data
    updatedAttendance.status = updatedAttendance.status[updatedAttendance.status.length - 1];
    delete updatedAttendance.leaveApplication;

    return updatedAttendance;
};


const applyForLeave = async (body, user) => {
    // console.log("body=========>>", body)
    // console.log("user========>>", user)
    // const schoolId = user.school;
    // const reason = body.reason;
    // const teacherId = user._id;
    // const days = body.days.map((date) => {
    //   const day = new Date(date); // Extract the date from the array
    //   day.setUTCHours(0, 0, 0, 0); // Set time to midnight (00:00:00) in UTC
    //   return day;
    // });
    // let leaveType = {
    //   'MaternityLeave': 77,
    //   "CasualLeave": 11,
    //   " CompensatoryOff": 10,
    //   "MarriageLeave": 55,
    //   "ShortLeave": 2,
    //   "Others": 2,
    // }
    // const getTotalLeaveBalance = (leaveType) => {
    //   let total = 0;
    //   for (const key in leaveType) {
    //     if (leaveType.hasOwnProperty(key)) {
    //       total += leaveType[key];
    //     }
    //   }
    //   return total;
    // };

    // // Calculate and display total leave balance
    // let totalLeaveRequset = body.days.length
    // console.log("totalLeaveRequset=======>>", totalLeaveRequset)
    // const totalLeaveBalance = getTotalLeaveBalance(leaveType);
    // console.log("Total Leave Balance:", totalLeaveBalance);
    // let totalNumberOfAvliableLeave = totalLeaveBalance
    // console.log("totalNumberOfAvliableLeave=======>>", totalNumberOfAvliableLeave)

    // let totalNumberOfLeave = totalLeaveBalance - totalLeaveRequset || 0
    // console.log("totalNumberOfLeave=======>>", totalNumberOfLeave)



    // const updateLeaveBalances = (leaveType, leavesTaken) => {
    //   for (const leave in leavesTaken) {
    //     if (leaveType.hasOwnProperty(leave)) {
    //       leaveType[leave] -= leavesTaken[leave];
    //     }
    //   }
    // };

    // // Example leaves taken (you can replace this with actual data)
    // // let dd = await Attendance.findOne({teacherId: teacherId})
    // let dd = await Attendance.findOne({ teacherId: 345 })
    // console.log("dd--------->>", dd.leaveApplication)
    // console.log("levae of number--------->>", dd.leaveApplication.length)
    // const calculateRemainingLeaveBalances = (initialLeaveBalances, leaveApplications) => {
    //   const leavesTaken = {};

    //   // Count leaves taken for each leave type
    //   for (const application of leaveApplications) {
    //     const leaveType = application.leaveType;
    //     leavesTaken[leaveType] = (leavesTaken[leaveType] || 0) + 1;
    //   }

    //   // Subtract leaves taken from initial leave balances
    //   for (const leaveType in initialLeaveBalances) {
    //     if (leavesTaken.hasOwnProperty(leaveType)) {
    //       initialLeaveBalances[leaveType] -= leavesTaken[leaveType];
    //     }
    //   }

    //   return initialLeaveBalances;
    // };

    // // Calculate remaining leave balances
    // const remainingLeaveBalances = calculateRemainingLeaveBalances(leaveType, dd);

    // // Display remaining leave balances
    // console.log("Remaining Leave Balances:");
    // for (const leaveType in remainingLeaveBalances) {
    //   console.log(`${leaveType}: ${remainingLeaveBalances[leaveType]}`);
    // }



    console.log("body=========>>", body);
    console.log("user========>>", user);

    const schoolId = user.school;
    const reason = body.reason;
    const teacherId = user._id;

    // Convert days to UTC midnight dates
    const days = body.days.map((date) => {
        const day = new Date(date);
        day.setUTCHours(0, 0, 0, 0);
        return day;
    });

    const dd = await Attendance.findOne({ teacherId: teacherId });
    console.log("Leave Applications:", dd.leaveApplication);
    console.log("Number of Leave Applications:", dd.leaveApplication.length);

    const initialLeaveBalances = {
        'Maternity Leave': 77,
        'Casual Leave': 11,
        'Compensatory Off': 10,
        'Marriage Leave': 55,
        'Short Leave': 2,
        'Others': 2,
    };

    const getTotalLeaveBalance = (initialLeaveBalances) => {
        let total = 0;
        for (const key in initialLeaveBalances) {
            if (initialLeaveBalances.hasOwnProperty(key)) {
                total += initialLeaveBalances[key];
            }
        }
        return total;
    };

    // Calculate total leave balance
    // const totalLeaveBalance = getTotalLeaveBalance(leaveType);
    const leaveApplications = dd.leaveApplication;


    let totalLeaveRequset = body.days.length
    console.log("totalLeaveRequset=======>>", totalLeaveRequset)
    const totalLeaveBalance = getTotalLeaveBalance(initialLeaveBalances);
    console.log("Total Leave Balance:", totalLeaveBalance);
    let totalNumberOfAvliableLeave = totalLeaveBalance
    console.log("totalNumberOfAvliableLeave=======>>", totalNumberOfAvliableLeave)

    // const calculateRemainingLeaveBalances = (initialLeaveBalances, leaveApplications) => {
    //   const leavesTaken = {};

    //   // Count leaves taken for each leave type
    //   for (const application of leaveApplications) {
    //     const leaveType = application.leaveType;
    //     leavesTaken[leaveType] = (leavesTaken[leaveType] || 0) + 1;
    //   }

    //   // Subtract leaves taken from initial leave balances
    //   for (const leaveType in leavesTaken) {
    //     if (initialLeaveBalances.hasOwnProperty(leaveType)) {
    //       initialLeaveBalances[leaveType] -= leavesTaken[leaveType];
    //       if (initialLeaveBalances[leaveType] < 0) {
    //         initialLeaveBalances[leaveType] = 0; // Ensure leave balance doesn't go negative
    //       }
    //     }
    //   }

    //   return initialLeaveBalances; // Return the updated leave balances
    // };

    // // Calculate remaining leave balances
    // const remainingLeaveBalances = calculateRemainingLeaveBalances(initialLeaveBalances, leaveApplications);

    // // Display remaining leave balances
    // console.log("Remaining Leave Balances:");
    // for (const leaveType in remainingLeaveBalances) {
    //   console.log(`${leaveType}: ${remainingLeaveBalances[leaveType]}`);
    // }


    const foundAttendance = await Attendance.findOne({
        schoolId: schoolId,
        teacherId: teacherId
    });

    if (!foundAttendance) {
        const newAttendance = {
            teacherId: teacherId,
            schoolId: schoolId,
            leaveApplication: days.map((day) => ({ date: day, reason: body.reason, leaveType: body.leaveType }))
        };
        const createdAttendance = new Attendance(newAttendance);
        const savedAttendance = await createdAttendance.save();
        let totalNumberOfAvliableLeave = totalLeaveBalance - savedAttendance.leaveApplication.length;
        console.log("totalNumberOfAvliableLeave======>>", totalNumberOfAvliableLeave);

        // Set the additional fields in the updatedTeacher object

        // savedAttendance.totalNumberOfAvliableLeave = totalNumberOfAvliableLeave;
        // savedAttendance.totalNumberOfLeave = totalLeaveBalance;
        const findUsersAttendance = await Attendance.findOneAndUpdate(
            { schoolId: schoolId, teacherId: teacherId },
            {
                // $push: { leaveApplication: { $each: days.map((day) => ({ date: day, reason: body.reason, leaveType: body.leaveType })) } },
                $set: { totalNumberOfAvliableLeave: totalNumberOfAvliableLeave, totalNumberOfLeave: totalLeaveBalance }
            },
            { new: true }
        );
        // Save the updatedTeacher object to the database
        // const savedTeacher = await updatedTeacher.save();

        // Check if the teacher object is saved successfully
        // if (savedTeacher) {
        //   return savedTeacher; // Return the saved teacher object
        // } else {
        //   throw "Failed to save updated teacher data to the database.";
        // }

        const calculateRemainingLeaveBalances = (initialLeaveBalances, leaveApplications) => {
            const leavesTaken = {};

            // Count leaves taken for each leave type
            for (const application of leaveApplications) {
                const leaveType = application.leaveType;
                leavesTaken[leaveType] = (leavesTaken[leaveType] || 0) + 1;
            }

            // Subtract leaves taken from initial leave balances
            for (const leaveType in leavesTaken) {
                if (initialLeaveBalances.hasOwnProperty(leaveType)) {
                    initialLeaveBalances[leaveType] -= leavesTaken[leaveType];
                    if (initialLeaveBalances[leaveType] < 0) {
                        initialLeaveBalances[leaveType] = 0; // Ensure leave balance doesn't go negative
                    }
                }
            }

            return initialLeaveBalances; // Return the updated leave balances
        };

        // Calculate remaining leave balances
        const remainingLeaveBalances = calculateRemainingLeaveBalances(initialLeaveBalances, leaveApplications);

        // Display remaining leave balances
        console.log("Remaining Leave Balances:");
        for (const leaveType in remainingLeaveBalances) {
            console.log(`${leaveType}: ${remainingLeaveBalances[leaveType]}`);
        }


        return findUsersAttendance;
    } else {
        // ... (rest of the code remains the same)
        // You can modify the existing code to loop through the 'days' array and apply the leave for each date.
        // For example:
        for (const day of days) {
            const alreadyMarked = foundAttendance.status.find((status) => {
                const statusDay = new Date(status.day);
                statusDay.setUTCHours(0, 0, 0, 0); // Set time to midnight (00:00:00) in UTC
                return (
                    statusDay.getUTCFullYear() === day.getUTCFullYear() &&
                    statusDay.getUTCMonth() === day.getUTCMonth() &&
                    statusDay.getUTCDate() === day.getUTCDate()
                );
            });

            if (alreadyMarked) {
                throw "You have already marked attendance on this day. You cannot apply for leave.";
            }

            const currentDate = new Date();
            currentDate.setUTCHours(0, 0, 0, 0); // Set time to midnight (00:00:00) in UTC

            if (day < currentDate) {
                throw "You can only apply for leave for the current date and future dates.";
            }

            const alreadyApplied = foundAttendance.leaveApplication.find((leave) => {
                const leaveDate = new Date(leave.date);
                leaveDate.setUTCHours(0, 0, 0, 0); // Set time to midnight (00:00:00) in UTC
                return (
                    leaveDate.getUTCFullYear() === day.getUTCFullYear() &&
                    leaveDate.getUTCMonth() === day.getUTCMonth() &&
                    leaveDate.getUTCDate() === day.getUTCDate()
                );
            });

            if (alreadyApplied) {
                throw "You have already applied for leave on this day.";
            }

            foundAttendance.leaveApplication.push({ date: day, reason: body.reason, leaveType: body.leaveType });
        }
        // foundAttendance
        const updatedTeacher = await foundAttendance.save();
        // const leaveApplications = updatedTeacher.leaveApplication;
        let totalNumberOfAvliableLeave = totalLeaveBalance - updatedTeacher.leaveApplication.length;
        console.log("totalNumberOfAvliableLeave======>>", totalNumberOfAvliableLeave);

        // Set the additional fields in the updatedTeacher object

        updatedTeacher.totalNumberOfAvliableLeave = totalNumberOfAvliableLeave;
        updatedTeacher.totalNumberOfLeave = totalLeaveBalance;
        console.log("updatedTeacher======>>", updatedTeacher.totalNumberOfAvliableLeave)
        // Save the updatedTeacher object to the database
        const savedTeacher = await updatedTeacher.save();


        console.log("savedTeacher=========>>", savedTeacher.totalNumberOfAvliableLeave)

        // Check if the teacher object is saved successfully
        // if (savedTeacher) {
        //   console.log("updatedTeacher======>>", savedTeacher.totalNumberOfAvliableLeave);
        //   console.log("updatedTeacher======>>", savedTeacher.totalNumberOfLeave);
        //   return savedTeacher; // Return the saved teacher object
        // } else {
        //   throw "Failed to save updated teacher data to the database.";
        // }


        const calculateRemainingLeaveBalances = (initialLeaveBalances, leaveApplications) => {
            const leavesTaken = {};

            // Count leaves taken for each leave type
            for (const application of leaveApplications) {
                const leaveType = application.leaveType;
                leavesTaken[leaveType] = (leavesTaken[leaveType] || 0) + 1;
            }

            // Subtract leaves taken from initial leave balances
            for (const leaveType in leavesTaken) {
                if (initialLeaveBalances.hasOwnProperty(leaveType)) {
                    initialLeaveBalances[leaveType] -= leavesTaken[leaveType];
                    if (initialLeaveBalances[leaveType] < 0) {
                        initialLeaveBalances[leaveType] = 0; // Ensure leave balance doesn't go negative
                    }
                }
            }

            return initialLeaveBalances; // Return the updated leave balances
        };

        // Calculate remaining leave balances
        const remainingLeaveBalances = calculateRemainingLeaveBalances(initialLeaveBalances, leaveApplications);

        // Display remaining leave balances
        console.log("Remaining Leave Balances:");
        for (const leaveType in remainingLeaveBalances) {
            console.log(`${leaveType}: ${remainingLeaveBalances[leaveType]}`);
        }

        if (savedTeacher) return savedTeacher;
        else throw "Failed to apply for leave.";
    }
};



const LeaveHistory = async (id, user) => {
    if (id) {
        const foundAttendance = await Attendance.findOne(
            {
                teacherId: user._id,
                "leaveApplication._id": id,
            },
            {
                "leaveApplication.$": 1,
            }
        );
        if (!foundAttendance) throw msg.AttendanceNotFound;
        return foundAttendance.leaveApplication[0];
    } else {
        const foundAttendance = await Attendance.findOne({
            teacherId: user._id,
        });
        if (!foundAttendance) throw msg.AttendanceNotFound;

        // Sort the leave applications by date in descending order
        foundAttendance.leaveApplication.sort((a, b) => b.date - a.date);

        // Group consecutive leave applications with a difference of one day
        const final = foundAttendance.leaveApplication.reduce((result, leave) => {
            const lastGroup = result[result.length - 1];
            if (lastGroup && Date.parse(lastGroup[lastGroup.length - 1].date) - Date.parse(leave.date) === 86400000) {
                lastGroup.push(leave);
            } else {
                result.push([leave]);
            }
            return result;
        }, []);

        return final;
    }
};

const cancelLeave = async (leaveIdArray, user) => {
    try {
      const leaveIds = leaveIdArray.map((obj) => obj.id); // Extract leave IDs from the array of objects
  
      const foundAttendance = await Attendance.findOneAndUpdate(
        {
          teacherId: user._id,
          'leaveApplication._id': { $in: leaveIds }, // Use $in operator to match multiple leave IDs
          'leaveApplication.status': { $in: ['Applied', 'Accepted'] },
        },
        {
          $pull: {
            leaveApplication: {
              _id: { $in: leaveIds }, // Use $in operator to remove multiple leave IDs
            },
          },
        },
        {
          new: true,
        }
      );
  
      if (!foundAttendance) {
        throw new Error("Leave not found");
      }
  
      for (const leaveObj of leaveIdArray) {
        const leaveId = leaveObj.id;
  
        const leaveStatus = foundAttendance.leaveApplication.find(
          (leave) => leave._id.toString() === leaveId.toString()
        );
  
        if (leaveStatus && leaveStatus.status === 'Accepted') {
          const updatedAttendance = await Attendance.findOneAndUpdate(
            {
              teacherId: user._id,
              'status.day': leaveStatus.date,
            },
            {
              $pull: {
                status: {
                  day: leaveStatus.date,
                },
              },
            },
            {
              new: true,
            }
          );
  
          if (!updatedAttendance) {
            throw new Error("Leave not updated");
          }
        }
      }
  
      return foundAttendance;
    } catch (error) {
      // Handle errors
      console.error(error);
      throw error;
    }
  };
  

  const getTodayPresentTeacherList = async (user, body, query) => {
    const { page } = query
    const limit = 10
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const skip = (page - 1) * limit;
  
    try {
      const { classId, sectionId, key } = query
      let filter = {
        schoolId: user.school
      }
      if (classId) filter.classId = mongoose.Types.ObjectId(classId)
      if (sectionId) filter.sectionId = sectionId
  
      if (key) {
        filter.$or = [
          { firstName: { $regex: key, $options: "i" } },
          { lastName: { $regex: key, $options: "i" } },
          { id: { $regex: key, $options: "i" } },
          { email: { $regex: key, $options: "i" } },
        ]
      }
  
      const presentTeachers = await Attendance.aggregate([
        {
          $match: {
            schoolId: mongoose.Types.ObjectId(user.school)
            , teacherId: { $exists: true }
          }
        },
        { $unwind: '$status' },
        { $match: { 'status.day': { $gte: today } } },
        { $match: { 'status.status': 'Present' } },
        {
          $lookup: {
            from: "users",
            localField: "teacherId",
            foreignField: "_id",
            as: "teacherDetails"
          }
        },
        {
          $addFields: {
            firstName: { $arrayElemAt: ["$details.firstName", 0] },
            lastName: { $arrayElemAt: ["$details.lastName", 0] },
            email: { $arrayElemAt: ["$details.email", 0] },
            id: { $toString: "$teacherId" },
            classId: { $arrayElemAt: ["$teacherDetails.class", 0] },
            sectionId: { $arrayElemAt: ["$teacherDetails.section", 0] },
          }
        },
        {
          $match: filter
        },
        {
          $project: {
            _id: 1,
            teacherId: 1,
            classId: 1,
            sectionId: 1,
            details: 1,
            schoolId: 1,
            status: 1,
            leaveApplication: 1,
            totalNumberOfAvliableLeave: 1,
            totalNumberOfLeave: 1,
            createdAt: 1,
            updatedAt: 1
          }
        }
      ]);
  
      return { msg: 'success', count: presentTeachers.length, data: presentTeachers, };
    } catch (error) {
      console.error('Error getting present teachers:', error);
      return { msg: 'error', error };
    }
  };
  
  
const getTodayAbsentTeacherList = async (user, body, query) => {
    const { page } = query
    const limit = 10
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const skip = (page - 1) * limit;
  
    try {
      const { classId, sectionId, key } = query
      let filter = {
        schoolId: user.school
      }
      if (classId) filter.classId = mongoose.Types.ObjectId(classId)
      if (sectionId) filter.sectionId = sectionId
  
      if (key) {
        filter.$or = [
          { firstName: { $regex: key, $options: "i" } },
          { lastName: { $regex: key, $options: "i" } },
          { id: { $regex: key, $options: "i" } },
          { email: { $regex: key, $options: "i" } },
        ]
      }
  
      const presentTeachers = await Attendance.aggregate([
        {
          $match: {
            schoolId: mongoose.Types.ObjectId(user.school)
            , teacherId: { $exists: true }
          }
        },
        { $unwind: '$status' },
        { $match: { 'status.day': { $gte: today } } },
        { $match: { 'status.status': 'Absent' } },
        {
          $lookup: {
            from: "users",
            localField: "teacherId",
            foreignField: "_id",
            as: "teacherDetails"
          }
        },
        {
          $addFields: {
            firstName: { $arrayElemAt: ["$details.firstName", 0] },
            lastName: { $arrayElemAt: ["$details.lastName", 0] },
            email: { $arrayElemAt: ["$details.email", 0] },
            id: { $toString: "$teacherId" },
            classId: { $arrayElemAt: ["$teacherDetails.class", 0] },
            sectionId: { $arrayElemAt: ["$teacherDetails.section", 0] },
          }
        },
        {
          $match: filter
        },
        {
          $project: {
            _id: 1,
            teacherId: 1,
            details: 1,
            classId: 1,
            sectionId: 1,
            schoolId: 1,
            status: 1,
            leaveApplication: 1,
            totalNumberOfAvliableLeave: 1,
            totalNumberOfLeave: 1,
            createdAt: 1,
            updatedAt: 1
          }
        }
      ]);
  
      return { msg: 'success', count: presentTeachers.length, data: presentTeachers, };
    } catch (error) {
      console.error('Error getting present teachers:', error);
      return { msg: 'error', error };
    }
  };


  const getTodayLeaveTeacherList = async (user, body) => {
    // Assuming 'db' is your database connection and 'teachers' is your collection
    // return { user }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
  
    try {
      const OnLeave = await Attendance.aggregate([
        { $match: { schoolId: mongoose.Types.ObjectId(user.school) } },
        // { $unwind: '$leaveApplication' },
        { $match: { 'leaveApplication.status': 'Applied' } },
        // {
        //   $group: {
        //     _id: teachedId, // or some grouping criteria if needed
        //     // totalApplied: { $sum: 1 },
        //     // data: { $push: '$$ROOT' }
        //   }
        // }
      ]);
  
  
      return { msg: 'success', data: OnLeave };
    } catch (error) {
      console.error('Error getting present teachers:', error);
      return { msg: 'error', error };
    }
  };
  
  const filterPresentTeacherByClassAndSection = async (user, query, body = {}) => {
    const { classId, sectionId } = query;
    const { key, status } = body;
  
    // Fetch teachers based on class, section, and role
    const teachers = await User.find({ class: classId, section: sectionId, roleId: 3 });
  
    // Array to store attendance records of present teachers
    const presentTeachersAttendance = [];
  
    // Get the current date without time components (midnight in UTC)
    const currentDate = new Date();
    currentDate.setUTCHours(0, 0, 0, 0);
    console.log("currentDate========>>", currentDate);
  
    // Iterate over each teacher
    for (const teacher of teachers) {
      const teacherId = teacher._id;
  
      // Fetch attendance records for the teacher for the current day
      const currentDayAttendance = await Attendance.find({
        teacherId: teacherId,
        "status.day": {
          $gte: new Date(currentDate),
          $lt: new Date(currentDate.getTime() + 86400000) // Add one day to current date for less than comparison
        }
      });
      console.log("currentDayAttendance=========>>", currentDayAttendance);
  
      // Check if the teacher has any attendance records for today with status 'Present'
      const isPresentToday = currentDayAttendance.some(attendance =>
        attendance.status.some(record => {
          const recordDate = new Date(record.day);
          recordDate.setUTCHours(0, 0, 0, 0);
          return recordDate.getTime() === currentDate.getTime() && record.status === 'Present';
        })
      );
  
      if (isPresentToday) {
        presentTeachersAttendance.push(...currentDayAttendance); // Push the attendance records themselves
      }
    }
  
    // If body is provided, filter the presentTeachersAttendance based on the criteria in the body
    if (body && Object.keys(body).length > 0) {
      let filteredAttendance = presentTeachersAttendance;
  
      if (key) {
        const id = parseInt(key);
        if (!isNaN(id)) {
          // If key is a number, filter by teacherId
          filteredAttendance = filteredAttendance.filter(attendance => attendance.teacherId === id);
        } else {
          // If key is not a number, filter by firstName, lastName, email, or teacherId in details field
          const regex = new RegExp(key, 'i');
          filteredAttendance = filteredAttendance.filter(attendance =>
            regex.test(attendance.details.firstName) ||
            regex.test(attendance.details.lastName) ||
            regex.test(attendance.details.email) ||
            regex.test(attendance.details.teacherId)
          );
        }
      }
  
      if (status) {
        filteredAttendance = filteredAttendance.filter(attendance =>
          attendance.status.some(record => record.status === status)
        );
      }
  
      return {
        msg: "Ok",
        count: filteredAttendance.length,
        result: filteredAttendance
      };
    }
  
    // Return all present teacher attendance records if no additional filters in body
    return {
      msg: "Ok",
      count: presentTeachersAttendance.length,
      result: presentTeachersAttendance
    };
  };
  
  
  
  
  const filterAbsentTeacherByClassAndSection = async (user, query, body) => {
    const { classId, sectionId } = query;
  
    // Fetch teachers based on class, section, and role
    const teachers = await User.find({ class: classId, section: sectionId, roleId: 3 });
  
    // Array to store attendance records of present teachers
    const presentTeachersAttendance = [];
  
    // Get the current date without time components (midnight in UTC)
    const currentDate = new Date();
    currentDate.setUTCHours(0, 0, 0, 0);
    console.log("currentDate========>>", currentDate);
  
    // Iterate over each teacher
    for (const teacher of teachers) {
      const teacherId = teacher._id;
  
      // Fetch attendance records for the teacher for the current day
      const currentDayAttendance = await Attendance.find({
        teacherId: teacherId,
        "status.day": {
          $gte: new Date(currentDate),
          $lt: new Date(currentDate.getTime() + 86400000) // Add one day to current date for less than comparison
        }
      });
      console.log("currentDayAttendance=========>>", currentDayAttendance);
  
      // Check if the teacher has any attendance records for today with status 'Present'
      const isPresentToday = currentDayAttendance.some(attendance =>
        attendance.status.some(record => {
          const recordDate = new Date(record.day);
          recordDate.setUTCHours(0, 0, 0, 0);
          return recordDate.getTime() === currentDate.getTime() && record.status === 'Absent';
        })
      );
  
      if (isPresentToday) {
        presentTeachersAttendance.push(...currentDayAttendance); // Push the attendance records themselves
      }
    }
  
    return {
      msg: "Ok",
      count: presentTeachersAttendance.length,
      result: presentTeachersAttendance
    };
  };
  
  
  
  
  const filterAttendanceByClassAndsecStatusNotMarkedTeacher = async (user, query) => {
    const { classId, sectionId } = query;
  
    // Fetch students based on class and section
    const students = await User.find({ classId, sectionId });
  
    // Array to store present students
    const presentStudents = [];
  
    // Iterate over each student
    for (const student of students) {
      const studentId = student._id;
  
      // Fetch attendance records for the current day
      const currentDayAttendance = await Attendance.findOne({
        userId: studentId,
        "status.day": { $gte: new Date(new Date().setHours(0, 0, 0, 0)) } // Filter for today's date
      }).populate("userId", "firstName lastName email");
  
      // Check if the student has any attendance records for today
      if (currentDayAttendance) {
        // Check each attendance record for today
        for (const record of currentDayAttendance.status) {
          if (record.day.getDate() === new Date().getDate() && record.status === 'Not Marked') {
            presentStudents.push(currentDayAttendance);
            break; // Break loop if present status found for today
          }
        }
      }
    }
    let finalArry = []
    for (let itrate of presentStudents) {
      if (itrate.classId == classId && itrate.sectionId == sectionId) {
        finalArry.push(itrate)
      }
    }
  
    return {
      msg: "Ok",
      count: finalArry.length,
      result: finalArry
    };
  };
  
  
  const getTodayNotMarkedStudentList = async (user, query) => {
    // Extract classId and sectionId from the query
    const { classId, sectionId } = query;
  
    // Get today's date in the required format
    let date = new Date();
    let month = date.getMonth() + 1;
    if (month < 10) month = `0${month}`;
    let todayDate = date.getDate();
    if (todayDate < 10) todayDate = `0${todayDate}`;
    let today = `${date.getFullYear()}-${month}-${todayDate}`;
  
    // Fetch marked attendance for today
    let attendanceMatchCondition = {
      schoolId: user.school,
      userId: { $exists: true },
    };
  
    if (classId) {
      attendanceMatchCondition.classId = mongoose.Types.ObjectId(classId);
    }
    if (sectionId) {
      attendanceMatchCondition.sectionId = mongoose.Types.ObjectId(sectionId);
    }
  
    let markedAttendance = await Attendance.aggregate([
      {
        $match: attendanceMatchCondition,
      },
      {
        $addFields: {
          todayStatus: "$status",
        },
      },
      { $unwind: "$todayStatus" },
      {
        $addFields: {
          attendanceDate: { $dateToString: { format: "%Y-%m-%d", date: '$todayStatus.day' } },
        },
      },
      {
        $match: {
          attendanceDate: today,
        },
      },
      {
        $project: {
          userId: 1,
        },
      },
    ]);
  
    let userId = markedAttendance.map((attendance) => mongoose.Types.ObjectId(attendance.userId));
  
    // Fetch students who have not marked attendance
    let userMatchCondition = {
      school: user.school,
      roleId: 0,
      _id: { $nin: userId },
    };
  
    if (classId) {
      userMatchCondition.class = mongoose.Types.ObjectId(classId);
    }
    if (sectionId) {
      userMatchCondition.section = mongoose.Types.ObjectId(sectionId);
    }
  
    let notMarkedAttendance = await User.aggregate([
      {
        $match: userMatchCondition,
      },
      {
        $addFields: {
          todayStatus: {
            day: date,
            status: "Not Marked",
          },
        },
      },
      {
        $project: {
          firstName: 1,
          lastName: 1,
          _id: 1,
          email: 1,
          todayStatus: 1,
        },
      },
    ]);
  
    // If class and section are provided, fetch classSection details
    let classSection = [];
    if (classId && sectionId) {
      const classSection = await Class.aggregate([
        {
          $match: {
            _id: mongoose.Types.ObjectId(query.classId),
            school: user.school,
          }
        },
        { $unwind: "$section" },
        { $match: { 'section._id': mongoose.Types.ObjectId(query.sectionId) } }
      ])
  
      let date = new Date()
      let month = date.getMonth() + 1
      if (month < 10) month = `0${month}`
      let todayDate = date.getDate()
      if (todayDate < 10) todayDate = `0${todayDate}`
      let today = `${date.getFullYear()}-${month}-${todayDate}`
  
      let markedAttendance = await Attendance.aggregate([
        {
          $match: {
            classId: mongoose.Types.ObjectId(query.classId),
            sectionId: query.sectionId,
            schoolId: user.school,
            userId: { $exists: true }
          }
        },
        {
          $addFields: {
            todayStatus: "$status"
          }
        },
        { $unwind: "$todayStatus" },
        {
          $addFields: {
            attendanceDate: { $dateToString: { format: "%Y-%m-%d", date: '$todayStatus.day' } }
          }
        },
        {
          $match: {
            attendanceDate: today
          }
        },
        {
          $project: {
            "userId": 1
          }
        }
      ]);
  
      let userId = []
      for (let i = 0; i < markedAttendance.length; i++) {
        userId.push(Number(markedAttendance[i].userId))
      }
  
      let notMarkedAttendance = await User.aggregate([
        {
          $match: {
            class: mongoose.Types.ObjectId(query.classId),
            section: query.sectionId,
            school: user.school,
            roleId: 0,
            _id: { $nin: userId }
          }
        },
        {
          $addFields: {
            todayStatus: {
              day: date,
              status: "Not Marked",
            }
          }
        },
        {
          $project: {
            "firstName": 1,
            "lastName": 1,
            "_id": 1,
            "email": 1,
            "todayStatus": 1
          }
        }
      ]);
  
      return {
        count: notMarkedAttendance.length,
        className: classSection[0].name,
        sectionName: classSection[0].section.name,
        data: notMarkedAttendance
  
      };
    }
  
    return {
      count: notMarkedAttendance.length,
      data: notMarkedAttendance,
  
    };
  };