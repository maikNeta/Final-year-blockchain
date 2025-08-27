import React, { useState, useRef, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { useWeb3 } from "../contexts/Web3Context";

function shortAddress(addr) {
  if (!addr) return "Connect Wallet";
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}

export default function Navbar() {
  const { account, isAdmin, isConnected, isLoading, error, initializeWeb3, disconnectWallet } = useWeb3();
  const [open, setOpen] = useState(false);
  const [menuAlign, setMenuAlign] = useState("left"); // 'left' or 'right'
  const menuRef = useRef();
  const buttonRef = useRef();

  // Only horizontal alignment logic
  useEffect(() => {
    if (open && buttonRef.current && menuRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const menuRect = menuRef.current.getBoundingClientRect();
      const spaceRight = window.innerWidth - buttonRect.left;
      if (spaceRight < menuRect.width && buttonRect.right > menuRect.width) {
        setMenuAlign("right");
      } else {
        setMenuAlign("left");
      }
    }
  }, [open]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target) && buttonRef.current && !buttonRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Keyboard accessibility: close on Escape
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
    } else {
      document.removeEventListener("keydown", handleKeyDown);
    }
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  // Dropdown menu classes for always downward, scrollable if needed
  const menuClasses = [
    "fixed z-50 w-64 bg-white border rounded shadow-lg mt-2",
    menuAlign === "right" ? "right-6" : "left-6",
    "max-h-[70vh] overflow-y-auto"
  ].join(" ");

  // Calculate top position for the menu (just below the button)
  let menuStyle = {};
  if (buttonRef.current) {
    const rect = buttonRef.current.getBoundingClientRect();
    menuStyle.top = rect.bottom + 8 + "px"; // 8px for mt-2
    menuStyle.left = menuAlign === "right" ? undefined : rect.left + "px";
    menuStyle.right = menuAlign === "right" ? window.innerWidth - rect.right + "px" : undefined;
  }

  return (
    <nav className="flex justify-between items-center px-6 py-4 bg-white shadow mb-8 relative">
      <div className="relative flex items-center">
        <button
          ref={buttonRef}
          className="px-4 py-2 bg-blue-600 text-white rounded focus:outline-none"
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="true"
          aria-expanded={open}
        >
          Menu
        </button>
        {open && (
          <>
            {/* Backdrop for closing menu when clicking outside */}
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)}></div>
            <div ref={menuRef} className={menuClasses} style={menuStyle}>
              <ul className="flex flex-col text-sm font-medium">
                <li>
                  <NavLink to="/" className={({ isActive }) => isActive ? "text-blue-600 block px-4 py-2" : "block px-4 py-2 hover:bg-gray-100"} onClick={() => setOpen(false)}>Home</NavLink>
                </li>
                <li>
                  <NavLink to="/vote" className={({ isActive }) => isActive ? "text-blue-600 block px-4 py-2" : "block px-4 py-2 hover:bg-gray-100"} onClick={() => setOpen(false)}>Vote</NavLink>
                </li>
                {isAdmin && (
                  <li>
                    <NavLink to="/admin" className={({ isActive }) => isActive ? "text-blue-600 block px-4 py-2" : "block px-4 py-2 hover:bg-gray-100"} onClick={() => setOpen(false)}>Admin</NavLink>
                  </li>
                )}
              </ul>
              {/* Divider and extra dropdown content */}
              <div className="border-t my-2"></div>
              <div className="px-4 py-2 text-xs text-gray-600">
                <div className="mb-1 font-semibold">User Info</div>
                <div>Address: <span className="font-mono">{shortAddress(account)}</span></div>
                {isAdmin && <div className="text-green-700 font-semibold">Admin</div>}
              </div>
            </div>
          </>
        )}
      </div>
      <div className="text-xl font-bold">Blockchain Voting System</div>
      <div className="text-sm">🦊 {shortAddress(account)}</div>
    </nav>
  );
} 