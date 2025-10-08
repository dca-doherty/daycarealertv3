import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import PageHeader from '../components/PageHeader';
import headerImage from '../images/pexels-cottonbro-3661356.jpg';
import '../styles/Privacy.css';

const Privacy = () => {
  return (
    <div className="privacy-page">
      <PageHeader title="Privacy Policy" backgroundImage={headerImage} />
      <Container className="privacy-container">
        <Row className="justify-content-center">
          <Col md={10}>
            <div className="privacy-content">
              <div className="privacy-body">
              <section>
                <h2>Introduction</h2>
                <p>
                  DaycareAlert.com ("we," "our," or "us") is committed to protecting your privacy. 
                  This Privacy Policy explains how we collect, use, disclose, and safeguard your information
                  when you visit our website or use our services.
                </p>
                <p>
                  Please read this Privacy Policy carefully. By accessing or using our website,
                  you acknowledge that you have read, understood, and agree to be bound by all the terms
                  outlined in this policy.
                </p>
              </section>

              <section>
                <h2>Information We Collect</h2>
                <h3>Personal Information</h3>
                <p>
                  We may collect personal information that you voluntarily provide to us when you:
                </p>
                <ul>
                  <li>Register for an account</li>
                  <li>Sign up for our newsletter</li>
                  <li>Contact us with inquiries</li>
                  <li>Participate in surveys or promotions</li>
                  <li>Post reviews or comments</li>
                </ul>
                <p>
                  This information may include your name, email address, phone number, and postal address.
                </p>

                <h3>Automatically Collected Information</h3>
                <p>
                  When you access our website, we may automatically collect certain information about your
                  device and usage patterns, including:
                </p>
                <ul>
                  <li>IP address</li>
                  <li>Browser type</li>
                  <li>Operating system</li>
                  <li>Referring URLs</li>
                  <li>Pages viewed</li>
                  <li>Time spent on pages</li>
                </ul>
              </section>

              <section>
                <h2>How We Use Your Information</h2>
                <p>We may use the information we collect for various purposes, including to:</p>
                <ul>
                  <li>Provide, maintain, and improve our services</li>
                  <li>Process and complete transactions</li>
                  <li>Send administrative information</li>
                  <li>Send marketing communications</li>
                  <li>Respond to inquiries and provide customer support</li>
                  <li>Monitor and analyze usage trends</li>
                  <li>Protect against, identify, and prevent fraud and other illegal activities</li>
                </ul>
              </section>

              <section>
                <h2>Data Security</h2>
                <p>
                  We implement appropriate technical and organizational security measures designed to
                  protect the security of any personal information we process. However, no security system
                  is impenetrable, and we cannot guarantee the absolute security of our databases.
                </p>
              </section>

              <section>
                <h2>Third-Party Disclosure</h2>
                <p>
                  We may share your information with third-party service providers who perform services on our behalf,
                  such as payment processing, data analysis, email delivery, and customer service.
                </p>
                <p>
                  We may also disclose your information if required by law or in response to valid requests by public
                  authorities (e.g., a court or government agency).
                </p>
              </section>

              <section>
                <h2>Children's Privacy</h2>
                <p>
                  Our website is not intended for children under 13 years of age. We do not knowingly collect personal
                  information from children under 13. If you are a parent or guardian and believe your child has provided
                  us with personal information, please contact us.
                </p>
              </section>

              <section>
                <h2>Changes to This Privacy Policy</h2>
                <p>
                  We may update our Privacy Policy from time to time. The updated version will be indicated by an
                  updated "Revised" date and the updated version will be effective as soon as it is accessible.
                </p>
              </section>

              <section>
                <h2>Contact Us</h2>
                <p>
                  If you have questions about this Privacy Policy, please contact us at:
                </p>
                <p>
                  Email: info@daycarealert.com<br />
                </p>
              </section>
              <div className="text-muted last-updated">Last Updated: April 13, 2025</div>
            </div>
          </div>
        </Col>
      </Row>
    </Container>
    </div>
  );
};

export default Privacy;
