import { Clock, Mail, MapPin, Phone } from 'lucide-react'
import React from 'react'

interface ContactItemData {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
}

const data: ContactItemData[] = [
  {
    title: "Visit Us",
    subtitle: "Ha Noi, Viet Nam",
    icon: (
      <MapPin className="h-5 w-5 text-neutral-500 transition-colors group-hover:text-shop_dark_green shrink-0" />
    ),
  },
  {
    title: "Call Us",
    subtitle: "+84 32 363 3636",
    icon: (
      <Phone className="h-5 w-5 text-neutral-500 transition-colors group-hover:text-shop_dark_green shrink-0" />
    ),
  },
  {
    title: "Working Hours",
    subtitle: "Mon - Sat: 10 AM - 7:00 PM",
    icon: (
      <Clock className="h-5 w-5 text-neutral-500 transition-colors group-hover:text-shop_dark_green shrink-0" />
    ),
  },
  {
    title: "Email Us",
    subtitle: "techwiseai@gmail.com",
    icon: (
      <Mail className="h-5 w-5 text-neutral-500 transition-colors group-hover:text-shop_dark_green shrink-0" />
    ),
  },
];

const FooterTop = () => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 border-b border-neutral-200 py-6 font-sans">
      {data?.map((item, index) => (
        <div
          key={index}
          className="flex items-center gap-3.5 group p-3 rounded-lg transition-colors hover:bg-neutral-50"
        >
          {item.icon}
          <div>
            <h3 className="font-sans text-sm font-bold uppercase tracking-wider text-neutral-900 transition-colors group-hover:text-shop_dark_green">
              {item?.title}
            </h3>
            <p className="font-sans text-xs sm:text-sm text-neutral-500 mt-0.5">
              {item?.subtitle}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default FooterTop