const { User } = require("../demoreact//backend/User/user/model/user.model")
const searchStudentByAdmin = async (user, data) => {
    // const isValidObjectId = mongoose.Types.ObjectId.isValid(data.key);

    const searchCriteria = [
        { roleId: 0, school: user.school, "firstName": { $regex: data.key, $options: "i" } },
        { roleId: 0, school: user.school, "lastName": { $regex: data.key, $options: "i" } },
        { roleId: 0, school: user.school, "phone": { $regex: data.key, $options: "i" } },
        { roleId: 0, school: user.school, "email": { $regex: data.key, $options: "i" } },
        { roleId: 0, school: user.school, "address.city": { $regex: data.key, $options: "i" } },
        { roleId: 0, school: user.school, "address.state": { $regex: data.key, $options: "i" } },
        // { roleId: 0, school: user.school, "fatherInfo.email": { $regex: data.key, $options: "i" } },
        // { roleId: 0, school: user.school, "fatherInfo.phone": { $regex: data.key, $options: "i" } },
        // { roleId: 0, school: user.school, "fatherInfo.name": { $regex: data.key, $options: "i" } },
        // { roleId: 0, school: user.school, "motherInfo.email": { $regex: data.key, $options: "i" } },
        // { roleId: 0, school: user.school, "motherInfo.name": { $regex: data.key, $options: "i" } },
        // { roleId: 0, school: user.school, "motherInfo.phone": { $regex: data.key, $options: "i" } },
    ];

    // If the key is a valid ObjectId, add the _id search to the criteria
    const keyAsNumber = Number(data.key);
    if (!isNaN(keyAsNumber)) {
        searchCriteria.push({ roleId: 0, school: user.school, _id: keyAsNumber });
    }

    let ress = await User.find({
        $or: searchCriteria
    }, "firstName lastName email phone address profile document role roleId motherInfo fatherInfo class section").lean();

    if (!ress.length) {
        return { msg: 'Student does not exist', result: [] }
    } else {
        return {
            msg: msg.success,
            count: ress.length,
            result: ress
        };
    }
};