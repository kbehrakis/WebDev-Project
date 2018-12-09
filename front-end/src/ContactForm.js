import React, {Component} from 'react';
import axios from 'axios';
import {FormGroup} from 'reactstrap';
import $ from 'jquery';

class ContactForm extends Component{
    constructor(props, context) {
      super(props, context);

      this.state = {
        allCourses: [],
        chosenCourses:[],
        isChecked: false,
      };

      this.handleChecked = this.handleChecked.bind(this);
    }

    getCourses = (e) => {
        e.preventDefault();

        console.log("HERES THE LIST: "+this.state.chosenCourses)

        //Extract the name and email that were entered
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const courseTitle = document.getElementById('courseTitle').value;
        const desiredName = document.getElementById('desiredName').value;

        // https://alligator.io/react/axios-react/
        axios({
            method: "POST",
            url:"http://localhost:3002/send",
            data: {
                name: name,
                email: email,
                desiredName: desiredName,
                reqClasses: [courseTitle]   // this.state.chosenCourses // ["ENGR3210: Sustainable Design"]    // THIS NEEDS TO BE UPDATED DYNAMICALLY BASED OFF allCourses ARRAY
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
              alert("Message with Events Failed to Send.")
          }
      })

      event.preventDefault();
    }


    auto = (event) => {


}


    resetForm(){
        document.getElementById('contact-form').reset();
    }

    componentDidMount(){
      axios.get('http://localhost:3002/listClasses')
      .then(res => {
          const courses = res.data;
          this.setState({allCourses:courses});
          var arr = this.state.allCourses
          var list = document.getElementById('mylist');
          console.log(arr)
          arr.forEach(function(item){
          var option = document.createElement('option');
            option.value = item;
            list.appendChild(option);
                });

      })
    }

    handleChecked(event) {
       event.preventDefault()

       this.setState({isChecked: !this.state.isChecked});

       var id = 'course'
       var courseName= $("#"+id).parent().text().trim();

       // Surrent array of chosen courses
       var chosenCourses = this.state.chosenCourses
       let index

       // If course not in list, add it
       if (!chosenCourses.includes(courseName)) {
         // add the numerical value of the checkbox to options array
         console.log("Adding course to list: "+courseName)
         chosenCourses.push(courseName)
       } else {
          console.log("Removing course from list: "+courseName)
         // Remove course if unchecking the box
         index = chosenCourses.indexOf(courseName)
         chosenCourses.splice(index, 1)
       }

       // update the state with the new array of options
       this.setState({chosenCourses: chosenCourses})
    }

    render(){
        return(
            <div className="col-sm-4 offset-sm-4">
           <link rel="stylesheet"  type="text/css" href="awesomplete.css" />
            <script src="awesomplete.js" async></script>
            <datalist id="mylist"></datalist>


                <form id="contact-form" method="POST">
                    <br></br>
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
                    <br></br>
                    <br></br>
                    <div className="form-group">
                        <label for="exampleCourseTitle">Course Title</label>
                        <input list="mylist" onClick = {this.auto} className="form-control" id="courseTitle" />
                    </div>
                    <div className="form-group">
                        <label for="exampleDesiredTitle">Title To Display on iCals</label>
                        <input type="email" className="form-control" id="desiredName" />
                    </div>
                    <button type="submit" className="btn btn-primary" onClick={this.getCourses}>Get Course Meetings</button>
                    <br></br>
                    <br></br>
                </form>
            </div>
        )
    }
}

export default ContactForm;
