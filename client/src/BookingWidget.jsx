import {useContext, useEffect, useState} from "react";
import {differenceInCalendarDays} from "date-fns";
import axios from "axios";
import {Navigate} from "react-router-dom";
import {UserContext} from "./UserContext.jsx";
import PhoneInput from "./PhoneInput.jsx";

export default function BookingWidget({place}) {

  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');

  const handleCheckInChange = (ev) => {
    const selectedCheckIn = ev.target.value;
    setCheckIn(selectedCheckIn);

    // Nếu ngày Check out hiện tại nhỏ hơn ngày Check in mới, đặt lại Check out
    if (checkOut && checkOut < selectedCheckIn) {
      setCheckOut(selectedCheckIn);
    }
  };

  const [rooms,setRooms] = useState(1);
  const [name,setName] = useState('');
  const [phone,setPhone] = useState('');
  const [isValid, setIsValid] = useState(false)

  const [redirect,setRedirect] = useState('');
  const {user} = useContext(UserContext);

  useEffect(() => {
    if (user) {
      setName(user.name);
    }
  }, [user]);

  const tomorrow = () => {
      const today = new Date();
      today.setDate(today.getDate() + 1); // Set the date to tomorrow
      return  today.toISOString().split('T')[0]
  }

  async function bookThisPlace() {
    try {
      const response = await axios.post('/bookings', {
        checkIn,
        checkOut,
        name,
        phone,
        place: place._id,
        price: place.price,
        rooms
      }, {
        withCredentials: true, // Include cookies in the request
      });

      const bookingId = response.data._id;
      if (!bookingId) {
        setRedirect('/login'); // Redirect to login if bookingId is not received
      } else {
        setRedirect(`/account/bookings/${bookingId}`); // Redirect to booking details page
      }
    } catch (error) {
      console.error('Booking failed:', error);

      // Check if the error is due to unauthorized access (e.g., 401 status code)
      if (error.response && error.response.status === 401) {
        setRedirect('/login'); // Redirect to login page if unauthorized
      } else {
        // Handle other errors (e.g., display an error message to the user)
        alert('Booking failed. Please try again later.');
      }
    }
  }

  if (redirect) {
    return <Navigate to={redirect} />
  }


  return (
    <div className="bg-white shadow p-4 rounded-2xl">
      <div className="text-2xl text-center">
        Price: ${place.price} / per night
      </div>
      <div className="border rounded-2xl mt-4">
        <div className="flex">
          <div className="py-3 px-4">
            <label>Check in:</label>
            <input
              type="date"
              value={checkIn}
              min={new Date().toISOString().split('T')[0]} // Ngày tối thiểu là hôm nay
              onChange={handleCheckInChange}
            />
          </div>
          <div className="py-3 px-4 border-l">
            <label>Check out:</label>
            <input
              type="date"
              value={checkOut}
              min={tomorrow()}
              onChange={ev => setCheckOut(ev.target.value)}
            />
          </div>
        </div>
        <div className="py-3 px-4 border-t">
          <label>Number of rooms:</label>
          <input type="number"
                 min={1}
                 value={rooms}
                 onChange={ev => setRooms(Number(ev.target.value))}/>
        </div>
        <div className="py-3 px-4 border-t">
            <label>Your full name:</label>
            <input type="text"
                   value={name}
                   onChange={ev => setName(ev.target.value)}/>
            <PhoneInput isValid={isValid} setIsValid={setIsValid} phone={phone} setPhone={setPhone}/>
        </div>
      </div>
      <button disabled={!isValid || !name || !rooms || !checkIn || !checkOut} onClick={bookThisPlace}
              className={`primary gray mt-4 ${!isValid || !name || !rooms || !checkIn || !checkOut ? 'cursor-no-drop': 'cursor-pointer'}`}>
        Book this room
      </button>
    </div>
  );
}