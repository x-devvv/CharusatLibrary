import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sidebar, SidebarBody, SidebarLink } from "./ui/sidebar";
import { useAuth } from "../hooks/useAuth";
import {
  IconArrowLeft,
  IconBrandTabler,
  IconSettings,
  IconUserBolt,
  IconBook,
  IconUsers,
  IconCategory,
  IconBookmark,
  IconHistory,
  IconLogout,
} from "@tabler/icons-react";

export default function DashboardLayout({ children }) {
  const [open, setOpen] = useState(true);
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      const { logout } = await import('../lib/api')
      await logout()
    } catch (error) {
      console.error('Logout error:', error)
    }
    setUser(null);
    navigate("/");
  };

  // Build links based on user role
  const links = [];

  // Common links for all authenticated users
  if (user) {
    links.push(
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: <IconBrandTabler className="text-gray-200 h-5 w-5 flex-shrink-0" />,
      },
      {
        label: "Books",
        href: "/books",
        icon: <IconBook className="text-gray-200 h-5 w-5 flex-shrink-0" />,
      }
    );

    // Member-specific links
    if (user.role === 'member') {
      links.push(
        {
          label: "My Transactions",
          href: "/transactions",
          icon: <IconHistory className="text-gray-200 h-5 w-5 flex-shrink-0" />,
        },
        {
          label: "Reservations",
          href: "/reservations",
          icon: <IconBookmark className="text-gray-200 h-5 w-5 flex-shrink-0" />,
        }
      );
    }

    // Librarian-specific links
    if (user.role === 'librarian') {
      links.push(
        {
          label: "Manage Books",
          href: "/admin/books",
          icon: <IconBook className="text-gray-200 h-5 w-5 flex-shrink-0" />,
        },
        {
          label: "Manage Transactions",
          href: "/admin/transactions",
          icon: <IconHistory className="text-gray-200 h-5 w-5 flex-shrink-0" />,
        },
        {
          label: "Authors",
          href: "/admin/authors",
          icon: <IconUsers className="text-gray-200 h-5 w-5 flex-shrink-0" />,
        }
      );
    }

    // Admin-specific links (admin has access to everything)
    if (user.role === 'admin') {
      links.push(
        {
          label: "Manage Books",
          href: "/admin/books",
          icon: <IconBook className="text-gray-200 h-5 w-5 flex-shrink-0" />,
        },
        {
          label: "Manage Transactions",
          href: "/admin/transactions",
          icon: <IconHistory className="text-gray-200 h-5 w-5 flex-shrink-0" />,
        },
        {
          label: "Authors",
          href: "/admin/authors",
          icon: <IconUsers className="text-gray-200 h-5 w-5 flex-shrink-0" />,
        },
        {
          label: "Users",
          href: "/admin/users",
          icon: <IconUsers className="text-gray-200 h-5 w-5 flex-shrink-0" />,
        },
        {
          label: "Categories",
          href: "/admin/categories",
          icon: <IconCategory className="text-gray-200 h-5 w-5 flex-shrink-0" />,
        }
      );
    }

    // Profile link for all users
    links.push({
      label: "Profile",
      href: "/profile",
      icon: <IconUserBolt className="text-gray-200 h-5 w-5 flex-shrink-0" />,
    });
  }

  return (
    <div className="flex flex-col md:flex-row w-full flex-1 overflow-hidden h-screen">
      <Sidebar open={open} setOpen={setOpen} animate={false}>
        <SidebarBody className="justify-between gap-10">
          <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
            {open ? <Logo /> : <LogoIcon />}
            <div className="mt-8 flex flex-col gap-2">
              {links.map((link, idx) => (
                <Link key={idx} to={link.href} className="no-underline">
                  <SidebarLink link={link} />
                </Link>
              ))}
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 group/sidebar py-3 px-3 cursor-pointer hover:bg-red-900/30 rounded-lg transition-all duration-200 text-gray-200 hover:text-red-400 w-full justify-start"
              >
                <div className="flex-shrink-0 flex items-center justify-center">
                  <IconLogout className="text-gray-200 h-5 w-5 group-hover:text-red-400" />
                </div>
                <span className="text-sm font-medium whitespace-nowrap">
                  Logout
                </span>
              </button>
            </div>
          </div>
          <div>
            <Link to="/profile" className="no-underline">
              <SidebarLink
                link={{
                  label: user?.name || "User",
                  href: "/profile",
                  icon: (
                    <img
                      src={user?.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=0D8ABC&color=fff`}
                      className="h-7 w-7 flex-shrink-0 rounded-full"
                      width={50}
                      height={50}
                      alt="Avatar"
                    />
                  ),
                }}
              />
            </Link>
          </div>
        </SidebarBody>
      </Sidebar>
      <div className="flex flex-1 overflow-hidden">
        <div className="border-l border-gray-800 bg-[#020617]/30 backdrop-blur-sm flex flex-col flex-1 w-full h-full overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}

export const Logo = () => {
  return (
    <Link
      to="/dashboard"
      className="font-normal flex space-x-3 items-center text-sm text-white py-3 px-2 hover:bg-gray-700/30 rounded-lg transition-colors relative z-20"
    >
      <div className="h-8 w-8 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
        <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      </div>
      <span className="font-semibold text-white whitespace-pre">
        Library Management
      </span>
    </Link>
  );
};

export const LogoIcon = () => {
  return (
    <Link
      to="/dashboard"
      className="font-normal flex items-center justify-center text-sm text-white py-3 relative z-20"
    >
      <div className="h-8 w-8 bg-blue-500 rounded-lg flex items-center justify-center">
        <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      </div>
    </Link>
  );
};
