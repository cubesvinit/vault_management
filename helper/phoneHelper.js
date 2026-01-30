const { PhoneNumberUtil, PhoneNumberFormat } = require('google-libphonenumber');


const normalizePhoneNumber = (phoneNumber, isoCode) => {
    try {
        const phoneUtil = PhoneNumberUtil.getInstance();
        const parsedNumber = phoneUtil.parse(phoneNumber, isoCode);

        if (!phoneUtil.isValidNumber(parsedNumber)) {
            return {
                status: 0,
                message: 'Phone Number is not correct'
            };
        }
        return {
            status: 1,
            message: 'Phone Number is correct'
        };
    } catch (error) {
        return {
            status: 0,
            message: 'Phone Number is not correct'
        };
    }
};

module.exports = {
    normalizePhoneNumber
};
