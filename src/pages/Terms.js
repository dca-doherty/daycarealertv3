import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import PageHeader from '../components/PageHeader';
import headerImage from '../images/pexels-mccutcheon-1148998.jpg';
import '../styles/Terms.css';

const Terms = () => {
  return (
    <div className="terms-page">
      <PageHeader title="Terms of Service" backgroundImage={headerImage} />
      <Container className="terms-container">
        <Row className="justify-content-center">
          <Col md={10}>
            <div className="terms-content">
              <div className="terms-body">
              <section>
                <h2>Agreement to Terms</h2>
                <p>
                  Welcome to DaycareAlert.com, a platform for finding, comparing, and reviewing daycare 
                  services in Texas. These Terms of Service ("Terms") govern your access to and use of 
                  DaycareAlert.com, including any content, functionality, and services offered on or through 
                  the website.
                </p>
                <p>
                  By accessing or using our website, you agree to be bound by these Terms. If you do not 
                  agree to these Terms, you must not access or use the website.
                </p>
              </section>

              <section>
                <h2>User Accounts</h2>
                <p>
                  When you create an account with us, you guarantee that the information you provide is accurate, 
                  complete, and current at all times. Inaccurate, incomplete, or obsolete information may result 
                  in the immediate termination of your account.
                </p>
                <p>
                  You are responsible for maintaining the confidentiality of your account and password and for 
                  restricting access to your computer. You agree to accept responsibility for all activities that 
                  occur under your account or password.
                </p>
              </section>

              <section>
                <h2>User Content</h2>
                <p>
                  Our website may allow you to post, link, store, share and otherwise make available certain information, 
                  text, graphics, videos, or other material ("Content") including daycare reviews and ratings.
                </p>
                <p>
                  By posting Content on our website, you:
                </p>
                <ul>
                  <li>Grant us the right to use, reproduce, modify, perform, display, distribute, and otherwise 
                    disclose to third parties any such Content.</li>
                  <li>Represent and warrant that you own or have the necessary rights to post such Content and 
                    that the Content does not violate the rights of any third party.</li>
                  <li>Agree that the Content will not contain material that is defamatory, obscene, indecent, 
                    abusive, offensive, harassing, violent, hateful, inflammatory, or otherwise objectionable.</li>
                </ul>
              </section>

              <section>
                <h2>Intellectual Property</h2>
                <p>
                  The website and its entire contents, features, and functionality (including but not limited to all 
                  information, software, text, displays, images, video, and audio, and the design, selection, and 
                  arrangement thereof) are owned by DaycareAlert.com, its licensors, or other providers of such 
                  material and are protected by United States and international copyright, trademark, patent, trade 
                  secret, and other intellectual property or proprietary rights laws.
                </p>
                <p>
                  You may not reproduce, distribute, modify, create derivative works of, publicly display, publicly 
                  perform, republish, download, store, or transmit any of the material on our website, except as 
                  follows:
                </p>
                <ul>
                  <li>Your computer may temporarily store copies of such materials in RAM incidental to your accessing 
                    and viewing those materials.</li>
                  <li>You may store files that are automatically cached by your Web browser for display enhancement 
                    purposes.</li>
                  <li>You may print or download one copy of a reasonable number of pages of the website for your own 
                    personal, non-commercial use and not for further reproduction, publication, or distribution.</li>
                </ul>
              </section>

              <section>
                <h2>Disclaimer of Warranties</h2>
                <p>
                  The information presented on or through the website is made available solely for general information 
                  purposes. We do not warrant the accuracy, completeness, or usefulness of this information. Any 
                  reliance you place on such information is strictly at your own risk.
                </p>
                <p>
                  The website and its content are provided on an "as is" and "as available" basis, without any 
                  warranties of any kind, either express or implied, including but not limited to warranties of 
                  merchantability, fitness for a particular purpose, non-infringement, or course of performance.
                </p>
              </section>

              <section>
                <h2>Limitation of Liability</h2>
                <p>
                  In no event will DaycareAlert.com, its affiliates, or their licensors, service providers, employees, 
                  agents, officers, or directors be liable for damages of any kind, under any legal theory, arising 
                  out of or in connection with your use, or inability to use, the website, any websites linked to it, 
                  any content on the website or such other websites, including any direct, indirect, special, 
                  incidental, consequential, or punitive damages.
                </p>
              </section>

              <section>
                <h2>Changes to the Terms</h2>
                <p>
                  We may revise and update these Terms from time to time in our sole discretion. All changes are 
                  effective immediately when we post them, and apply to all access to and use of the website 
                  thereafter.
                </p>
                <p>
                  Your continued use of the website following the posting of revised Terms means that you accept 
                  and agree to the changes.
                </p>
              </section>

              <section>
                <h2>Contact Us</h2>
                <p>
                  If you have any questions about these Terms, please contact us at:
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

export default Terms;
