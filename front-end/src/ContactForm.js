import React, {Component} from 'react';
import axios from 'axios';
import {FormGroup, Label, Input} from 'reactstrap';

class ContactForm extends Component{
    constructor(props, context) {
      super(props, context);

      this.state = {
        allCourses: [],
        chosenCourses:[]
      };

      this.handleChecked = this.handleChecked.bind(this)
    }

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
                reqClasses: ["ENGR3210: Sustainable Design"]    // THIS NEEDS TO BE UPDATED DYNAMICALLY BASED OFF allCourses ARRAY
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
              email: email
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

    componentDidMount(){
      axios.get('http://localhost:3002/listClasses')
      .then(res => {
          const courses = res.data;
          this.setState({allCourses:courses});
      })
    }

    handleChecked() {
    //   e.preventDefault()

       const courseName = document.getElementById('courseName').value;

      // current array of chosen courses
       const chosenCourses = this.state.chosenCourses
       let index

       // If course not in list, add it
       if (!chosenCourses.includes(courseName)) {
         // add the numerical value of the checkbox to options array
         chosenCourses.push(courseName)
       } else {
         // Remove course if it's already there (unchedking the box)
         index = chosenCourses.indexOf(courseName)
         chosenCourses.splice(index, 1)
       }

       // update the state with the new array of options
       this.setState({chosenCourses: chosenCourses})
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
                    <br></br>
                    <br></br>
                    <FormGroup check>
                      {this.state.allCourses.map(function(object, i){
                            return <label type = "label" check>
                                        <input type="checkbox" onChange={this.handleChecked}/> {' '}
                                        <label id="courseName">{object}</label>
                                   </label>
                      })}
                    </FormGroup>
                </form>
            </div>
        )
    }
}

export default ContactForm;
