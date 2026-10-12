import Link from 'next/link'
import React from 'react'

const SignIn = () => {
  return (
    <Link
      href="/sign-in"
      className="text-sm font-semibold
    hover:text-darkColor text-lightColor hover:cursor-pointer hoverEffect"
    >
      Login
    </Link>
  )
}

export default SignIn