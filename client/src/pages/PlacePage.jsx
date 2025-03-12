import {Link, useParams} from "react-router-dom";
import {useEffect, useState} from "react";
import axios from "axios";
import BookingWidget from "../BookingWidget.jsx";
import PlaceGallery from "../PlaceGallery";
import AddressLink from "../AddressLink";

export default function PlacePage() {
  const {id} = useParams();
  const [place,setPlace] = useState(null);
  useEffect(() => {
    if (!id) {
      return;
    }
    axios.get(`/places/${id}`).then(response => {
      setPlace(response.data);
    });
  }, [id]);

  if (!place) return '';



  return (
    <div className="mt-4 bg-gray-100 -mx-8 px-8 pt-8">
      <h1 className="text-3xl">{place.title}</h1>
      <AddressLink address={place.address} />
      <PlaceGallery place={place} />
      <div className="mt-8 mb-8 grid gap-8 grid-cols-1 md:grid-cols-[2fr_1fr]">
        <div>
          <div className="p-2 border-2 my-2">
            <p className="text-center text-2xl font-bold">Room's information</p>
            Check-in: {place.checkIn}<br/>
            Check-out: {place.checkOut}<br/>
            Max number of guests: {place.maxGuests}
            <div className="my-2">
              <p className="font-semibold">Description</p>
              <div className="whitespace-pre-wrap">{place.description}</div>
            </div>
          </div>

          <hr/>
          <div className="p-2 border-2 my-2">
            <p className="text-center text-2xl font-bold">Owner's information of this room</p>
            Name: {place.name}<br/>
            Phone: {place.phone}<br/>
            Email: {place.email}<br/>
          </div>

        </div>
        <div>
          <BookingWidget place={place}/>
        </div>
      </div>
      <div className="bg-white -mx-8 px-8 py-8 border-t">
        <div>
          <h2 className="font-semibold text-2xl">Extra info</h2>
        </div>
        <div className="mb-4 mt-2 text-sm text-gray-700 leading-5 whitespace-pre-wrap">{place.extraInfo}</div>
      </div>
    </div>
  );
}
