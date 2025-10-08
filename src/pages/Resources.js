import React, { useState } from 'react';
import PageHeader from '../components/PageHeader';
import headerImage from '../images/pexels-naomi-shi-374023-1001914.jpg';
import '../styles/Resources.css';

const Resources = () => {
  // Resources data
  const resources = [
    {
      title: "Understanding Child Care Licensing",
      description: "Learn about the types of child care providers, inspections, and regulations in Texas.",
      content: "Child care licensing in Texas ensures that providers meet specific standards for children's safety and well-being.\n\nThere are three main types of regulated child care: Licensed Centers, Licensed Homes, and Registered Homes. Licensed Centers are usually larger facilities, while Licensed and Registered Homes are smaller, home-based operations.\n\nThe Texas Health and Human Services Commission conducts regular inspections to ensure compliance with state standards, which cover areas such as staff-to-child ratios, safety measures, educational programs, and more."
    },
    {
      title: "Choosing the Right Daycare",
      description: "Get tips and considerations for selecting the best daycare for your child.",
      content: "Selecting the right daycare is a crucial decision for parents. Start by researching licensed providers in your area and checking their inspection histories.\n\nWhen visiting potential daycares, observe the interactions between staff and children, assess the cleanliness and safety of the facility, and inquire about their daily routines and educational programs.\n\nImportant factors to consider include staff-to-child ratios, staff qualifications, nutrition policies, and emergency procedures. Don't hesitate to ask questions and trust your instincts when making this important choice for your child."
    },
    {
      title: "Interpreting Violation Reports",
      description: "Understand daycare violation reports and what they mean for your child's safety.",
      content: "Violation reports provide valuable information about a daycare's compliance with state regulations. These reports typically categorize violations based on their severity: high, medium-high, medium, medium-low, and low.\n\nHigh and medium-high violations are the most serious and often relate directly to children's health and safety. When reviewing reports, pay attention to patterns of violations and how quickly they were corrected.\n\nRemember that occasional minor violations are common, but repeated or serious violations may be cause for concern. You can usually find these reports on your state's child care licensing website."
    },
    {
      title: "Early Childhood Development",
      description: "Access information on key developmental milestones and how quality childcare can support your child's growth.",
      content: "Early childhood is a critical period for cognitive, social, emotional, and physical development. Quality childcare can play a significant role in supporting this development.\n\nLook for daycares that offer age-appropriate activities and learning experiences. Key areas of development include language skills, social interaction, problem-solving abilities, and motor skills.\n\nA good daycare should provide a stimulating environment that encourages exploration and learning through play. Regular communication between caregivers and parents is also crucial to track and support a child's developmental progress."
    }
  ];

  // Component for each resource section
  const ResourceSection = ({ resource, index }) => {
    const [expanded, setExpanded] = useState(false);
    
    return (
      <div className="resource-section">
        <div className="resource-header" onClick={() => setExpanded(!expanded)}>
          <h2>{resource.title}</h2>
          <span className={`expand-icon ${expanded ? 'expanded' : ''}`}>
            {expanded ? '−' : '+'}
          </span>
        </div>
        
        <div className={`resource-content ${expanded ? 'expanded' : ''}`}>
          <p className="resource-description">{resource.description}</p>
          <div className="resource-full-content">
            {resource.content.split('\n\n').map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="resources-page">
      <PageHeader title="Resources & Information" backgroundImage={headerImage} />
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-10">
            <div className="resources-content">
              <div className="resources-body">
                <p className="resources-intro">
                  Explore our collection of resources to help you make informed decisions about childcare in Texas.
                  Click on each section to expand and read more information.
                </p>
                
                <div className="resource-accordion">
                  {resources.map((resource, index) => (
                    <ResourceSection key={index} resource={resource} index={index} />
                  ))}
                </div>
                
                <div className="resources-footer">
                  <p>
                    For more information about daycare regulations in Texas, visit the 
                    <a href="https://www.hhs.texas.gov/providers/protective-services-providers/child-care-regulation" 
                       target="_blank" 
                       rel="noopener noreferrer"> Texas Health and Human Services</a> website.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Resources;