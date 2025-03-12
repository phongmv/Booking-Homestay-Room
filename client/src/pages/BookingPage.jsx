import {useParams} from "react-router-dom";
import {useEffect, useState} from "react";
import axios from "axios";
import AddressLink from "../AddressLink";
import PlaceGallery from "../PlaceGallery";
import BookingDates from "../BookingDates";
import {differenceInCalendarDays} from "date-fns";

export default function BookingPage() {
  const {id} = useParams();
  const [booking,setBooking] = useState(null);
  useEffect(() => {
    if (id) {
      axios.get('/bookings').then(response => {
        const foundBooking = response.data.find(({_id}) => _id === id);
        if (foundBooking) {
          setBooking(foundBooking);
        }
      });
    }
  }, [id]);

  if (!booking) {
    return '';
  }

  return (
    <div className="my-8">
      <h1 className="text-3xl">{booking?.place?.title}</h1>
      <AddressLink className="my-2 block" address={booking.place.address} />
      <div className="bg-gray-200 p-6 my-6 rounded-2xl flex items-center justify-between">
        <div>
          <h2 className="text-2xl mb-4">Your booking information:</h2>
          <BookingDates booking={booking}/>
          <span>Address: {booking?.address}</span><br/>
          <span>Number of Rooms: {booking?.rooms}</span><br/>
          <span>Name: {booking?.name}</span><br/>
          <span>Phone: {booking?.phone}</span><br/>
        </div>
        <div className="bg-primary p-6 text-white rounded-2xl">
          <div>Total price</div>
          <div className="text-3xl">${differenceInCalendarDays(new Date(booking.checkOut), new Date(booking.checkIn)) * booking.price * booking.rooms }</div>
        </div>
      </div>
      <PlaceGallery place={booking.place} />
    </div>
  );
}