import {useContext, useEffect, useState} from "react";
import {differenceInCalendarDays} from "date-fns";
import axios from "axios";
import {Navigate} from "react-router-dom";
import {UserContext} from "./UserContext.jsx";
import {el} from "date-fns/locale";

export default function BookingWidget({place}) {
  const [checkIn,setCheckIn] = useState('');
  const [checkOut,setCheckOut] = useState('');
  const [numberOfGuests,setNumberOfGuests] = useState(1);
  const [name,setName] = useState('');
  const [phone,setPhone] = useState('');
  const [redirect,setRedirect] = useState('');
  const {user} = useContext(UserContext);
  axios.defaults.withCredentials = true;
  useEffect(() => {
    if (user) {
      setName(user.name);
    }
  }, [user]);

  let numberOfNights = 0;
  if (checkIn && checkOut) {
    numberOfNights = differenceInCalendarDays(new Date(checkOut), new Date(checkIn));
  }

  async function bookThisPlace() {
    try {
      const response = await axios.post('/bookings', {
        checkIn,
        checkOut,
        numberOfGuests,
        name,
        phone,
        place: place._id,
        price: place.price,
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
            <input type="date"
                   value={checkIn}
                   onChange={ev => setCheckIn(ev.target.value)}/>
          </div>
          <div className="py-3 px-4 border-l">
            <label>Check out:</label>
            <input type="date" value={checkOut}
                   onChange={ev => setCheckOut(ev.target.value)}/>
          </div>
        </div>
        <div className="py-3 px-4 border-t">
          <label>Number of guests:</label>
          <input type="number"
                 value={numberOfGuests}
                 onChange={ev => setNumberOfGuests(ev.target.value)}/>
        </div>
        <div className="py-3 px-4 border-t">
            <label>Your full name:</label>
            <input type="text"
                   value={name}
                   onChange={ev => setName(ev.target.value)}/>
            <label>Phone number:</label>
            <input type="tel"
                   value={phone}
                   onChange={ev => setPhone(ev.target.value)}/>
        </div>
      </div>
      <button disabled={!checkIn || !checkOut || !numberOfGuests || !name || !phone} onClick={bookThisPlace} className="primary mt-4">
        Book this room
      </button>
    </div>
  );
}