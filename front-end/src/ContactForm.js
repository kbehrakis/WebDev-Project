import React, {Component} from 'react';
import axios from 'axios';

class ContactForm extends Component{
    getCourses = (e) => {
        e.preventDefault();

        //Extract the name and email that were entered
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;

        // https://alligator.io/react/axios-react/
        axios({
            method: "POST",
            url:"http://localhost:3002/send",
            data: {
                name: name,
                email: email,
            }
        }).then((response)=>{
            if (response.data.msg === 'success'){
                alert("Message Sent.");
                this.resetForm()
            }else if(response.data.msg === 'fail'){
                alert("Message Failed to Send.")
            }
        })
    }

    getCalendar = (event) => {
      const email = document.getElementById('email').value;

      axios({
          method: "POST",
          url:"http://localhost:3002/sendEvents",
          data: {
              email: email,
          }
      }).then((response)=>{
          if (response.data.msg === 'success'){
              alert("Message with Events Sent.");
              this.resetForm()
          }else if(response.data.msg === 'fail'){
              alert("Message eith Events Failed to Send.")
          }
      })

      event.preventDefault();
    }

    resetForm(){
        document.getElementById('contact-form').reset();
    }

    render(){
        return(
            <div className="col-sm-4 offset-sm-4">
                <form id="contact-form" method="POST">
                    <div className="form-group">
                        <label for="name">Name</label>
                        <input type="text" className="form-control" id="name" />
                    </div>
                    <div className="form-group">
                        <label for="exampleInputEmail1">Email address</label>
                        <input type="email" className="form-control" id="email" aria-describedby="emailHelp" />
                    </div>
                    <button type = "submit" className="btn btn-primary" onClick={this.getCalendar}>Get Calendar Events</button>
                    <br></br>
                    <br></br>
                    <button type="submit" className="btn btn-primary" onClick={this.getCourses}>Get Course Meetings</button>
                </form>
            </div>
        )
    }
}

export default ContactForm;
