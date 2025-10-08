import React, { useState } from 'react';
import { Container, Row, Col, Card, Button, Badge, Form, InputGroup } from 'react-bootstrap';
import { FaStar, FaStarHalfAlt, FaRegStar, FaShoppingCart, FaHeart, FaRegHeart, FaFilter } from 'react-icons/fa';
import productImage from '../../images/pexels-mccutcheon-1148998.jpg';
import '../../styles/marketplace/ProductShowcase.css';

// Mock product data - in a real app, this would come from an API
const products = [
  {
    id: 'p1',
    name: 'Montessori Learning Tower',
    image: 'https://via.placeholder.com/300x200',
    price: 129.99,
    rating: 4.8,
    reviews: 128,
    description: 'Help children safely reach countertops and participate in kitchen activities. Made from solid wood with non-toxic finish.',
    category: 'Furniture',
    affiliate_link: 'https://example.com/learning-tower',
    tags: ['Safety', 'Learning', 'Kitchen'],
    bulk_discount: true,
    bulk_price: 99.99,
    bulk_quantity: 5
  },
  {
    id: 'p2',
    name: 'Sensory Play Kit (Set of 10)',
    image: 'https://via.placeholder.com/300x200',
    price: 49.99,
    rating: 4.5,
    reviews: 87,
    description: 'Encourage tactile exploration with this comprehensive set of sensory materials. Perfect for 2-5 year olds.',
    category: 'Educational Toys',
    affiliate_link: 'https://example.com/sensory-kit',
    tags: ['Sensory', 'Educational', 'Development'],
    bulk_discount: true,
    bulk_price: 39.99,
    bulk_quantity: 3
  },
  {
    id: 'p3',
    name: 'Circle Time Carpet (3m x 3m)',
    image: 'https://via.placeholder.com/300x200',
    price: 89.99,
    rating: 4.2,
    reviews: 54,
    description: 'Colorful, educational carpet featuring alphabet, numbers, and shapes. Made from stain-resistant, easy-clean material.',
    category: 'Furniture',
    affiliate_link: 'https://example.com/circle-carpet',
    tags: ['Classroom', 'Educational', 'Comfort'],
    bulk_discount: false
  },
  {
    id: 'p4',
    name: 'First Aid Kit - Daycare Edition',
    image: 'https://via.placeholder.com/300x200',
    price: 39.99,
    rating: 4.9,
    reviews: 212,
    description: 'Comprehensive first aid kit designed specifically for childcare facilities. Includes extra bandages, non-latex gloves, and child-friendly items.',
    category: 'Safety Equipment',
    affiliate_link: 'https://example.com/daycare-firstaid',
    tags: ['Safety', 'Emergency', 'Health'],
    bulk_discount: true,
    bulk_price: 29.99,
    bulk_quantity: 2
  },
  {
    id: 'p5',
    name: 'Child-Safe Cabinet Locks (12 Pack)',
    image: 'https://via.placeholder.com/300x200',
    price: 18.99,
    rating: 4.6,
    reviews: 173,
    description: 'Keep curious hands away from dangerous items with these easy-to-install, difficult-for-children-to-open cabinet locks.',
    category: 'Safety Equipment',
    affiliate_link: 'https://example.com/cabinet-locks',
    tags: ['Safety', 'Childproofing'],
    bulk_discount: true,
    bulk_price: 15.99,
    bulk_quantity: 2
  },
  {
    id: 'p6',
    name: 'Washable Fingerpaints (Set of 8)',
    image: 'https://via.placeholder.com/300x200',
    price: 21.99,
    rating: 4.3,
    reviews: 92,
    description: 'Non-toxic, washable fingerpaints in vibrant colors. Perfect for encouraging creativity and sensory play.',
    category: 'Art Supplies',
    affiliate_link: 'https://example.com/fingerpaints',
    tags: ['Art', 'Creativity', 'Sensory'],
    bulk_discount: true,
    bulk_price: 17.99,
    bulk_quantity: 3
  },
  {
    id: 'p7',
    name: 'Nap Time Cots (Set of 4)',
    image: 'https://via.placeholder.com/300x200',
    price: 129.99,
    rating: 4.7,
    reviews: 68,
    description: 'Stackable, easy-to-clean cots for nap time. Includes fitted sheets and name card holders.',
    category: 'Furniture',
    affiliate_link: 'https://example.com/nap-cots',
    tags: ['Sleep', 'Comfort', 'Storage'],
    bulk_discount: true,
    bulk_price: 109.99,
    bulk_quantity: 2
  },
  {
    id: 'p8',
    name: 'Storytelling Puppet Set',
    image: 'https://via.placeholder.com/300x200',
    price: 34.99,
    rating: 4.4,
    reviews: 47,
    description: 'Set of 10 hand puppets representing diverse characters for interactive storytelling and dramatic play.',
    category: 'Educational Toys',
    affiliate_link: 'https://example.com/puppet-set',
    tags: ['Language', 'Creativity', 'Social Skills'],
    bulk_discount: false
  }
];

// Available categories for filtering
const categories = [...new Set(products.map(product => product.category))];

// Available tags for filtering
const allTags = [...new Set(products.flatMap(product => product.tags))];

const ProductShowcase = () => {
  const [favoriteProducts, setFavoriteProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState(products);
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedTags, setSelectedTags] = useState([]);
  const [showBulkOnly, setShowBulkOnly] = useState(false);
  const [priceRange, setPriceRange] = useState({ min: 0, max: 200 });
  const [searchQuery, setSearchQuery] = useState('');
  
  // Handle toggling a product as favorite
  const toggleFavorite = (productId) => {
    if (favoriteProducts.includes(productId)) {
      setFavoriteProducts(favoriteProducts.filter(id => id !== productId));
    } else {
      setFavoriteProducts([...favoriteProducts, productId]);
    }
  };
  
  // Filter products based on various criteria
  const applyFilters = () => {
    let filtered = [...products];
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(query) || 
        product.description.toLowerCase().includes(query) ||
        product.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }
    
    // Filter by category
    if (activeCategory !== 'All') {
      filtered = filtered.filter(product => product.category === activeCategory);
    }
    
    // Filter by tags
    if (selectedTags.length > 0) {
      filtered = filtered.filter(product => 
        selectedTags.some(tag => product.tags.includes(tag))
      );
    }
    
    // Filter by bulk discount availability
    if (showBulkOnly) {
      filtered = filtered.filter(product => product.bulk_discount);
    }
    
    // Filter by price range
    filtered = filtered.filter(product => 
      product.price >= priceRange.min && product.price <= priceRange.max
    );
    
    setFilteredProducts(filtered);
  };
  
  // Handle category change
  const handleCategoryChange = (category) => {
    setActiveCategory(category);
    // Apply filters immediately when category changes
    setTimeout(applyFilters, 0);
  };
  
  // Handle tag selection
  const handleTagToggle = (tag) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
    // Apply filters after state update
    setTimeout(applyFilters, 0);
  };
  
  // Handle bulk discount filter
  const handleBulkFilterChange = (e) => {
    setShowBulkOnly(e.target.checked);
    // Apply filters after state update
    setTimeout(applyFilters, 0);
  };
  
  // Handle price range changes
  const handlePriceChange = (e, boundary) => {
    const value = parseInt(e.target.value, 10);
    setPriceRange(prev => ({
      ...prev,
      [boundary]: value
    }));
  };
  
  // Apply price range filter when done changing value
  const handlePriceFilterApply = () => {
    applyFilters();
  };
  
  // Handle search
  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
    // Apply filters after slight delay
    setTimeout(applyFilters, 300);
  };
  
  // Reset all filters
  const resetFilters = () => {
    setActiveCategory('All');
    setSelectedTags([]);
    setShowBulkOnly(false);
    setPriceRange({ min: 0, max: 200 });
    setSearchQuery('');
    setFilteredProducts(products);
  };
  
  // Render star ratings
  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    for (let i = 1; i <= 5; i++) {
      if (i <= fullStars) {
        stars.push(<FaStar key={i} className="star-icon filled" />);
      } else if (i === fullStars + 1 && hasHalfStar) {
        stars.push(<FaStarHalfAlt key={i} className="star-icon filled" />);
      } else {
        stars.push(<FaRegStar key={i} className="star-icon" />);
      }
    }
    
    return stars;
  };
  
  return (
    <div className="product-showcase">
      <Container fluid>
        <Row>
          {/* Filter Sidebar */}
          <Col md={3} className="filter-sidebar">
            <div className="filter-section">
              <h4 className="filter-title">
                <FaFilter className="filter-icon" /> Filters
                <Button 
                  variant="link" 
                  size="sm" 
                  className="reset-btn"
                  onClick={resetFilters}
                >
                  Reset All
                </Button>
              </h4>
              
              <Form.Group className="mb-4">
                <Form.Label>Search Products</Form.Label>
                <InputGroup>
                  <Form.Control 
                    type="text" 
                    placeholder="Search by name or keyword..."
                    value={searchQuery}
                    onChange={handleSearch}
                  />
                </InputGroup>
              </Form.Group>
              
              <Form.Group className="mb-4">
                <Form.Label>Categories</Form.Label>
                <div className="category-filters">
                  <Button
                    variant={activeCategory === 'All' ? 'primary' : 'outline-secondary'}
                    size="sm"
                    className="category-btn"
                    onClick={() => handleCategoryChange('All')}
                  >
                    All
                  </Button>
                  {categories.map(category => (
                    <Button
                      key={category}
                      variant={activeCategory === category ? 'primary' : 'outline-secondary'}
                      size="sm"
                      className="category-btn"
                      onClick={() => handleCategoryChange(category)}
                    >
                      {category}
                    </Button>
                  ))}
                </div>
              </Form.Group>
              
              <Form.Group className="mb-4">
                <Form.Label>Popular Tags</Form.Label>
                <div className="tag-filters">
                  {allTags.map(tag => (
                    <Badge
                      key={tag}
                      bg={selectedTags.includes(tag) ? 'primary' : 'light'}
                      text={selectedTags.includes(tag) ? 'white' : 'dark'}
                      className="tag-badge"
                      onClick={() => handleTagToggle(tag)}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </Form.Group>
              
              <Form.Group className="mb-4">
                <Form.Label>Price Range</Form.Label>
                <div className="price-range-inputs">
                  <InputGroup className="mb-2">
                    <InputGroup.Text>$</InputGroup.Text>
                    <Form.Control
                      type="number"
                      min="0"
                      max={priceRange.max}
                      value={priceRange.min}
                      onChange={(e) => handlePriceChange(e, 'min')}
                    />
                  </InputGroup>
                  <span className="range-separator">to</span>
                  <InputGroup className="mb-2">
                    <InputGroup.Text>$</InputGroup.Text>
                    <Form.Control
                      type="number"
                      min={priceRange.min}
                      value={priceRange.max}
                      onChange={(e) => handlePriceChange(e, 'max')}
                    />
                  </InputGroup>
                </div>
                <Button 
                  variant="outline-primary" 
                  size="sm" 
                  className="w-100"
                  onClick={handlePriceFilterApply}
                >
                  Apply Price Filter
                </Button>
              </Form.Group>
              
              <Form.Group className="bulk-filter">
                <Form.Check
                  type="switch"
                  id="bulk-discount-switch"
                  label="Bulk Discount Available"
                  checked={showBulkOnly}
                  onChange={handleBulkFilterChange}
                />
              </Form.Group>
            </div>
          </Col>
          
          {/* Products Display */}
          <Col md={9}>
            <div className="products-header">
              <h2>Daycare Products & Supplies</h2>
              <p className="lead">
                Curated selection of quality products for daycare centers. Affiliate links support our mission to improve daycare safety.
              </p>
              <div className="results-info">
                Showing {filteredProducts.length} of {products.length} products
              </div>
            </div>
            
            <Row className="product-grid">
              {filteredProducts.length > 0 ? (
                filteredProducts.map(product => (
                  <Col lg={4} md={6} key={product.id} className="product-col">
                    <Card className="product-card">
                      <div className="product-image-container">
                        <Card.Img 
                          variant="top" 
                          src={productImage} 
                          className="product-image" 
                        />
                        <button 
                          className="favorite-btn"
                          onClick={() => toggleFavorite(product.id)}
                          aria-label={favoriteProducts.includes(product.id) ? "Remove from favorites" : "Add to favorites"}
                        >
                          {favoriteProducts.includes(product.id) ? 
                            <FaHeart className="heart-icon favorited" /> : 
                            <FaRegHeart className="heart-icon" />
                          }
                        </button>
                        
                        {product.bulk_discount && (
                          <div className="discount-badge">
                            <span>Bulk Discount</span>
                          </div>
                        )}
                      </div>
                      
                      <Card.Body>
                        <div className="product-tags">
                          {product.tags.map(tag => (
                            <Badge key={tag} bg="light" text="dark" className="product-tag">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        <Card.Title className="product-name">{product.name}</Card.Title>
                        <div className="product-category">
                          <Badge bg="secondary" className="category-badge">
                            {product.category}
                          </Badge>
                        </div>
                        <div className="product-rating">
                          <span className="stars">
                            {renderStars(product.rating)}
                          </span>
                          <span className="rating-text">
                            {product.rating} ({product.reviews})
                          </span>
                        </div>
                        <Card.Text className="product-description">
                          {product.description}
                        </Card.Text>
                        <div className="product-price">
                          <span className="regular-price">${product.price}</span>
                          {product.bulk_discount && (
                            <div className="bulk-info">
                              <span className="bulk-price">${product.bulk_price}</span> for {product.bulk_quantity}+ units
                            </div>
                          )}
                        </div>
                      </Card.Body>
                      <Card.Footer className="product-footer">
                        <Button 
                          variant="primary" 
                          className="buy-btn"
                          href={product.affiliate_link}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <FaShoppingCart className="cart-icon" /> View Deal
                        </Button>
                      </Card.Footer>
                    </Card>
                  </Col>
                ))
              ) : (
                <Col xs={12} className="no-products">
                  <div className="no-results">
                    <h3>No products match your filters</h3>
                    <p>Try changing your search criteria or reset filters</p>
                    <Button variant="outline-primary" onClick={resetFilters}>
                      Reset All Filters
                    </Button>
                  </div>
                </Col>
              )}
            </Row>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default ProductShowcase;