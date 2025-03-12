import React from 'react';

const PhoneInput = ({phone, setPhone, isValid, setIsValid}) => {

  const validatePhoneNumber = (phoneNumber) => {
    // Biểu thức chính quy để kiểm tra số điện thoại Việt Nam
    const regex = /^(0)(3[2-9]|5[2689]|7[06-9]|8[1-9]|9[0-9])[0-9]{7}$/;
    return regex.test(phoneNumber);
  };

  const handlePhoneChange = (ev) => {
    const value = ev.target.value;
    setPhone(value);

    // Kiểm tra tính hợp lệ của số điện thoại
    if (value === '' || validatePhoneNumber(value)) {
      setIsValid(true);
    } else {
      setIsValid(false);
    }
  };

  return (
    <div>
      <label>Phone number:</label>
      <input
        type="tel"
        value={phone}
        onChange={handlePhoneChange}
        style={{borderColor: isValid ? 'initial' : 'red'}} // Đổi màu viền nếu số điện thoại không hợp lệ
      />
      {!isValid && (
        <p style={{color: 'red', fontSize: '0.875rem', marginTop: '4px'}}>
          Số điện thoại không hợp lệ.
        </p>
      )}
    </div>
  );
};

export default PhoneInput;