import React, { useState, useEffect } from 'react';
import axios from '../../api/axios';
import { useAuthContext } from '../../hooks/useAuthContext';
import { Link, useNavigate } from 'react-router-dom';

function MbotCampaign() {

    const {user} = useAuthContext();
    const [campaign, setCampaign] = useState([]);

    useEffect(() => {
        axios.get('api/broadcast/get/campaign/', {headers:{
          accessToken: user.token
        }}).then((response) => {
          setCampaign(response.data)
        })
      }, [])

  return (
    <div className='App'>
    <div className="container mt-3">
      <div className="row justify-content-center text-center">
        <div className="col-lg-12">
        <h1 className="mt-4 header-title">M-BOT</h1>
        <p>Manage Campaign</p>
        </div>
        <div className="row justify-content-center text-center">
        <div className='col-sm-8'>
        <div className="d-grid my-3 gap-2">
        <Link className='btn btn-sm btn-success' to='/mbot/create/campaign'>+ Create New Campaign</Link>
        </div>
            <div className='card'>
        <table class="table table-hover text-center">
  <thead>
    <tr>
      <th scope="col">#</th>
      <th scope="col">Name</th>
      <th scope="col">Status</th>
      <th scope="col">Contacts</th>
      <th scope="col">Sent</th>
    </tr>
  </thead>
    {campaign.map((value, key) =>{

      return (
  <tbody>
  
    <tr>
      <th scope="row">{key+1}</th>
      <td>{value.campaignName}</td>
      <td>{value.campaignStatus}</td>
      <td>{value.totalContacts}</td>
      <td>{value.msgSent}</td>
    </tr>
  </tbody>)
    })}
    </table>
    </div>
    </div>
    </div>
        </div>
        </div>
        </div>
  )
}

export default MbotCampaign