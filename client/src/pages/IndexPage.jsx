import {useEffect, useState} from "react";
import axios from "axios";
import {Link} from "react-router-dom";
import Image from "../Image.jsx";

export default function IndexPage() {
  const [places,setPlaces] = useState([]);
  const [filter, setFilter] = useState([])

  const handleSearchRoom = (ev) => {
    const searchTerm = ev.target.value.trim().toLowerCase(); // Trim và chuyển thành chữ thường
    const searchTermWithoutDiacritics = removeDiacritics(searchTerm); // Chuyển đổi searchTerm thành không dấu

    if (!searchTermWithoutDiacritics) {
      setFilter(places); // Nếu search term trống, hiển thị tất cả places
      return;
    }

    const filtering = places.filter(place => {
      // Chuyển đổi các trường dữ liệu thành không dấu và tìm kiếm
      const addressWithoutDiacritics = place.address ? removeDiacritics(place.address.toLowerCase()) : '';
      const titleWithoutDiacritics = place.title ? removeDiacritics(place.title.toLowerCase()) : '';

      return (
        addressWithoutDiacritics.includes(searchTermWithoutDiacritics) ||
        titleWithoutDiacritics.includes(searchTermWithoutDiacritics)
      );
    });

    setFilter(filtering);
  };

// Hàm chuyển đổi tiếng Việt có dấu thành không dấu
  const removeDiacritics = (str) => {
    return str.normalize('NFD') // Tách ký tự thành base và dấu
      .replace(/[\u0300-\u036f]/g, '') // Loại bỏ dấu
      .replace(/đ/g, 'd').replace(/Đ/g, 'D'); // Xử lý riêng cho 'đ' và 'Đ'
  };

  useEffect(() => {
    axios.get('/places').then(response => {
      setPlaces(response.data);
      setFilter(response.data)
    });
  }, []);
  return (
    <div>
      <div className="py-3 px-4">
        <input placeholder="Search room" type="text"
               onChange={handleSearchRoom}/>
      </div>
      <div className="mt-8 grid gap-x-6 gap-y-8 grid-cols-2 md:grid-cols-3 lg:grid-cols-3">
        {filter.length > 0 && filter.map(place => (
          <Link to={'/place/' + place._id}>
            <div className="bg-gray-500 mb-2 rounded-2xl flex">
              {place.photos?.[0] && (
                <Image className="rounded-2xl object-cover aspect-square" src={place.photos?.[0]} alt=""/>
              )}
            </div>
            <h2 className="font-bold break-words">{place.address}</h2>
            <h3 className="text-sm text-gray-500 break-words">{place.title}</h3>
            <div className="mt-1">
              <span className="font-bold">${place.price}</span> per night
            </div>
          </Link>
        ))}
      </div>

    </div>
  );
}
