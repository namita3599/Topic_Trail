import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { ToastContainer} from 'react-toastify'
import { handleError, handleSuccess } from '../utils'
import { useNavigate } from 'react-router-dom';
import styles from "./signup.module.css";

function Signup(){

    const[signupInfo , setSignupInfo] = useState({
        name: '',
        email: '',
        password: ''
    })

    const navigate = useNavigate();

    const handleChange = (e) => {
        const {name,value} = e.target;
        console.log(name,value);
        const copySignupInfo = {...signupInfo};
        copySignupInfo[name] = value;
        setSignupInfo(copySignupInfo);
    }

    const handleSignup = async (e) => {
        e.preventDefault();
        const {name, email, password} = signupInfo;
        if (!name || !email || !password){
            return handleError('All fields are mandatory.')
        }
        try {
            const url= "http://localhost:8080/auth/signup" //backend url
            const response = await fetch (url, {
                method: "POST",
                headers: {
                    'Content-Type' : 'application/json'
                },
                body: JSON.stringify(signupInfo)
            });
            const result = await response.json();
            const { success, message, error } = result;
            if (success){
                handleSuccess(message);
                setTimeout(()=>{
                    navigate('/login')
                }, 1000)
            }else if (error) {
                const details = error?.details[0].message;
                handleError(details);
            } else if (!success) {
                handleError(message);
            }
            console.log(result);
        } catch (err) {
            handleError(err);
        }
    }

    return (
      <>
        <img src="/logo.png" alt="Topic Trail Logo" className={styles.logo} />
        <div className={styles.page}>
          <div className={styles.formside}>
            <div className={styles.container}>
              <h1>Signup</h1>
              <form onSubmit={handleSignup}>
                <div>
                  <label htmlFor="name">Name</label>
                  <input
                    onChange={handleChange}
                    type="text"
                    name="name"
                    autoFocus
                    placeholder="Enter your name"
                    value={signupInfo.name}
                  />
                </div>
                <div>
                  <label htmlFor="email">Email</label>
                  <input
                    onChange={handleChange}
                    type="email"
                    name="email"
                    autoFocus
                    placeholder="Enter your Email"
                    value={signupInfo.email}
                  />
                </div>
                <div>
                  <label htmlFor="password">Password</label>
                  <input
                    onChange={handleChange}
                    type="password"
                    name="password"
                    autoFocus
                    placeholder="Enter a Password"
                    value={signupInfo.password}
                  />
                </div>
                <button type="submit">Signup</button>
                <span>
                  Already have an account?
                  <Link to="/login">Login</Link>
                </span>
              </form>
            </div>
          </div>
          <div className={styles.imgside}>
            <img src="/bg.jpg" alt="bg" className={styles.sideimg} />
          </div>
          <ToastContainer />
        </div>
      </>
    );
}

export default Signup