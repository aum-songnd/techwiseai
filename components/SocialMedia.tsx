import React from 'react';
import {
  FaYoutube,
  FaGithub,
  FaLinkedin,
  FaFacebook,
  FaSlack,
} from 'react-icons/fa';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';

import Link from 'next/link';

const socialLink = [
  {
    title: 'Youtube',
    href: 'https://www.youtube.com',
    icon: <FaYoutube className="w-5 h-5" />,
  },
  {
    title: 'Github',
    href: 'https://www.github.com',
    icon: <FaGithub className="w-5 h-5" />,
  },
  {
    title: 'Linkedin',
    href: 'https://www.linkedin.com',
    icon: <FaLinkedin className="w-5 h-5" />,
  },
  {
    title: 'Facebook',
    href: 'https://www.facebook.com',
    icon: <FaFacebook className="w-5 h-5" />,
  },
  {
    title: 'Slack',
    href: 'https://www.slack.com',
    icon: <FaSlack className="w-5 h-5" />,
  },
];

const SocialMedia = () => {
  return (
    <TooltipProvider>
      <div className="flex items-center gap-5">
        {socialLink.map((item) => (
          <Tooltip key={item.title}>
            <TooltipTrigger>
              <Link
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 border rounded-full flex items-center justify-center hover:text-shop_light_green hoverEffect"
              >
                {item.icon}
              </Link>
            </TooltipTrigger>

            <TooltipContent>
              {item.title}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
};

export default SocialMedia;